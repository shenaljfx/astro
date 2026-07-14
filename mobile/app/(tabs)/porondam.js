import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Platform, Share, Alert,
  LayoutAnimation, UIManager, Dimensions, Image, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown, FadeIn, FadeOut,
  ZoomIn, FadeInUp,
  useSharedValue, useAnimatedStyle, withTiming, withSpring,
  withSequence, withRepeat, withDelay, Easing, interpolate, cancelAnimation,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Line, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import DesktopScreenWrapper, { useDesktopCtx } from '../../components/DesktopScreenWrapper';
import { DatePickerField, TimePickerField } from '../../components/CosmicDateTimePicker';
import SriLankanChart from '../../components/SriLankanChart';
import MarkdownText from '../../components/MarkdownText';
import SpringPressable from '../../components/effects/SpringPressable';
import CosmicLoader from '../../components/effects/CosmicLoader';
import CitySearchPicker from '../../components/CitySearchPicker';
import useScreenInsets from '../../hooks/useScreenInsets';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { screenColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { boxShadow, textShadow } from '../../utils/shadow';
import useReducedMotion from '../../hooks/useReducedMotion';
import useLowEndDevice from '../../hooks/useLowEndDevice';
import { CosmicBackground } from '../../components/CosmicBackground';
import { generatePorondamHTML, loadLogoBase64 } from '../../utils/pdfReportGenerator';
import RadarChart from '../../components/RadarChart';
import { ZODIAC_IMAGES as ZODIAC_IMAGE_LIST } from '../../components/ZodiacIcons';
import { deriveArchetype as deriveLagnaArchetype, BANDS as ARCHETYPE_BANDS } from '../../utils/porondamArchetypes';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

var { width: W, height: H } = Dimensions.get('window');
var WIDE = W >= 700;
var MOBILE_CHART = Math.min(W - 64, 300);

// Default birth city (Colombo)
var DEFAULT_CITY = { name: 'Colombo', country: 'Sri Lanka', countryCode: 'LK', lat: 6.9271, lng: 79.8612 };

// Rashi name translation helper
var RASHI_SI = {
  Aries: 'මේෂ', Taurus: 'වෘෂභ', Gemini: 'මිථුන', Cancer: 'කටක',
  Leo: 'සිංහ', Virgo: 'කන්‍යා', Libra: 'තුලා', Scorpio: 'වෘශ්චික',
  Sagittarius: 'ධනු', Capricorn: 'මකර', Aquarius: 'කුම්භ', Pisces: 'මීන',
};

// Zodiac sign images by rashi ID (1=Aries...12=Pisces)
var ZODIAC_IMAGES = {
  1: ZODIAC_IMAGE_LIST[0],
  2: ZODIAC_IMAGE_LIST[1],
  3: ZODIAC_IMAGE_LIST[2],
  4: ZODIAC_IMAGE_LIST[3],
  5: ZODIAC_IMAGE_LIST[4],
  6: ZODIAC_IMAGE_LIST[5],
  7: ZODIAC_IMAGE_LIST[6],
  8: ZODIAC_IMAGE_LIST[7],
  9: ZODIAC_IMAGE_LIST[8],
  10: ZODIAC_IMAGE_LIST[9],
  11: ZODIAC_IMAGE_LIST[10],
  12: ZODIAC_IMAGE_LIST[11],
};
var RASHI_NAMES = ['', 'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
var RASHI_NAMES_SI = ['', 'මේෂ', 'වෘෂභ', 'මිථුන', 'කටක', 'සිංහ', 'කන්‍යා', 'තුලා', 'වෘශ්චික', 'ධනු', 'මකර', 'කුම්භ', 'මීන'];

// Glass Card
function Glass({ children, style, accent }) {
  return (
    <View style={[sty.glass, style]}>
      <LinearGradient
        colors={accent
          ? ['rgba(244,63,94,0.10)', 'rgba(255,140,0,0.08)', 'rgba(18,6,12,0.6)']
          : ['rgba(18,6,12,0.55)', 'rgba(14,4,10,0.45)', 'rgba(12,4,8,0.55)']}
        style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />
      {children}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// CACHE CONSTANTS
// ═══════════════════════════════════════════════════════════════
var PORONDAM_CACHE_KEY = '@grahachara_saved_porondam';
var MAX_SAVED_PORONDAM = 10;

// Porondam loading screen - Twin Horoscope Convergence
var PORONDAM_LOADING_STAGES = {
  en: [
    { title: 'Mapping your cosmic fingerprints', sub: 'Aligning both birth skies to find where your stars overlap.', icon: 'planet-outline' },
    { title: 'Scanning 7 chemistry signals', sub: 'Passion, conflict style, daily vibe, emotions, influence, health, and prosperity.', icon: 'analytics-outline' },
    { title: 'Measuring your emotional rhythm', sub: 'How you fight, flirt, and feel safe together — patterns are emerging.', icon: 'pulse-outline' },
    { title: 'Testing the deeper soul bond', sub: 'Long-term staying power, life phase sync, and hidden magnetism.', icon: 'diamond-outline' },
    { title: 'Writing your love story', sub: 'Weaving everything into your personalised compatibility report.', icon: 'sparkles' },
  ],
  si: [
    { title: 'උපත් සිතියම් දෙක සකසමින්', sub: 'ලග්නය, චන්ද්‍ර රාශිය, සහ නැකත එකට පෙළගස්වමින්.', icon: 'planet-outline' },
    { title: 'පොරොන්දම් ලකුණු හත කියවමින්', sub: 'දින, ගණ, යෝනි, රාශි, වශ්‍ය, නාඩි, සහ මහේන්ද්‍ර ගැළපීම සසඳමින්.', icon: 'analytics-outline' },
    { title: 'හැඟීම් රිද්මය මැන බලමින්', sub: 'දෛනික පහසුව, ආකර්ෂණය, පවුල් ගලායෑම, සහ කැපවීම සකසමින්.', icon: 'pulse-outline' },
    { title: 'ගැඹුරු බැඳීම විශ්ලේෂණය කරමින්', sub: 'නවාංශක, ජීවිත අදියර, සහ දිගුකාලීන සහාය පිරිපහදු කරමින්.', icon: 'diamond-outline' },
    { title: 'ගැළපීම් කතාව සූදානම් කරමින්', sub: 'අවසාන සබඳතා කියවීම පිරිසිදු කරමින්.', icon: 'sparkles' },
  ],
};

var PORONDAM_SIGNAL_TRACK = [
  { en: 'Dina', si: 'දින', icon: 'sunny-outline', color: '#FBBF24' },
  { en: 'Gana', si: 'ගණ', icon: 'people-outline', color: '#A78BFA' },
  { en: 'Yoni', si: 'යෝනි', icon: 'heart-outline', color: '#F472B6' },
  { en: 'Rashi', si: 'රාශි', icon: 'moon-outline', color: '#60A5FA' },
  { en: 'Vasya', si: 'වශ්‍ය', icon: 'magnet-outline', color: '#FB923C' },
  { en: 'Nadi', si: 'නාඩි', icon: 'pulse-outline', color: '#34D399' },
  { en: 'Mahendra', si: 'මහේන්ද්‍ර', icon: 'leaf-outline', color: '#22D3EE' },
];

function buildPorondamParticles(count) {
  var items = [];
  for (var i = 0; i < count; i++) {
    var seed = i + 1;
    items.push({
      x: ((seed * 37 + 11) % 100),
      y: ((seed * 61 + 19) % 100),
      size: 1.5 + ((seed * 17) % 18) / 10,
      delay: (seed * 173) % 2400,
      speed: 1600 + ((seed * 263) % 1800),
      drift: 5 + ((seed * 29) % 15),
      color: seed % 4 === 0 ? '#FBBF24' : seed % 4 === 1 ? '#F9A8D4' : seed % 4 === 2 ? '#93C5FD' : '#C084FC',
      baseOpacity: 0.18 + ((seed * 13) % 32) / 100,
    });
  }
  return items;
}

var PORONDAM_LOADING_PARTICLES = buildPorondamParticles(34);

// ── Signal copy — plain language first, the classical name as the credential ──
// Voice: warm counsel (EN) · elevated ඔබ register, flowing not stiff (SI).
// Tiers speak of care, never doom: good / mixed / poor → natural / workable / needs attention.
var TIER_COLORS = { good: '#34D399', mixed: '#E8C97A', poor: '#F59E0B' };

var SIGNAL_COPY = {
  Dina: {
    plainName: { en: 'Everyday Life Together', si: 'එකට ගෙවෙන දවස' },
    techName: { en: 'Dina Porondam', si: 'දින පොරොන්දම' },
    short: { en: 'Daily', si: 'දවස' },
    what: { en: 'This checks how easily your daily routines — waking, meals, work, rest — fit together.', si: 'මෙයින් බලන්නේ දෙදෙනාගේ දවසේ රටාව — නැගිටින වෙලාව, කෑම, වැඩ, විවේකය — කොතරම් පහසුවෙන් එකට ගැළපෙනවාද කියායි.' },
    good: { en: 'Your daily routines match well. Living together should feel easy and comfortable on most days.', si: 'දෙදෙනාගේ දවසේ රටාව හොඳින් ගැළපෙනවා. එකට ජීවත් වෙද්දී බොහෝ දවස්වල පහසුවක් සහ සැහැල්ලුවක් දැනේවි.' },
    mixed: { en: 'Your routines differ a little. Talk early about sleep, meals and money habits — small agreements make daily life smooth.', si: 'දවසේ රටාවල පොඩි වෙනස්කම් තිබෙනවා. නින්ද, කෑම සහ වියදම් ගැන කලින්ම කතා කරගන්න — පොඩි එකඟතාවලින් එදිනෙදා ජීවිතය පහසු වෙනවා.' },
    poor: { en: 'You run on quite different daily clocks. This is workable — but talk honestly about routines from the very start, so neither of you quietly gets worn out.', si: 'දෙදෙනාගේ දවසේ රටා සෑහෙන්න වෙනස්. මේක හදාගත හැකි දෙයක් — නමුත් මුල සිටම දවසේ රටාව ගැන අවංකව කතා කරගන්න. එවිට කාටවත් නොදැනී මහන්සිය එකතු වන්නේ නැහැ.' },
  },
  Gana: {
    plainName: { en: 'Temper & Stress Style', si: 'තරහ සහ පීඩනය දරන විදිය' },
    techName: { en: 'Gana Porondam', si: 'ගණ පොරොන්දම' },
    short: { en: 'Temper', si: 'ස්වභාවය' },
    what: { en: 'This checks whether you two react to stress and anger in a similar way.', si: 'මෙයින් බලන්නේ තරහ ගිය විට හෝ පීඩනයක් ආ විට දෙදෙනා හැසිරෙන විදිය සමානද කියායි.' },
    good: { en: 'You handle stress the same way, so arguments cool down fast instead of growing into big fights.', si: 'දෙදෙනාම පීඩනය දරන විදිය සමානයි. ඒ නිසා අමනාපයක් ආවත් ඉක්මනින් නිවෙනවා — ලොකු රණ්ඩුවක් බවට වැඩෙන්නේ නැහැ.' },
    mixed: { en: 'You react differently when upset. Learn what upsets each other — then a clash becomes a chance to understand, not a fight.', si: 'තරහ ගිය විට දෙදෙනා හැසිරෙන විදිය වෙනස්. එකිනෙකාව කලබල කරන දේවල් හඳුනාගන්න — එවිට ගැටුමක් රණ්ඩුවක් නොවී, තේරුම් ගැනීමට අවස්ථාවක් වෙනවා.' },
    poor: { en: 'One of you stays quiet while the other heats up fast. Neither is wrong — just give tempers time to cool, and be patient with each other’s pace.', si: 'එක් අයෙක් නිහඬ වෙද්දී අනෙකා ඉක්මනින් රත් වෙනවා. දෙදෙනාම වැරදි නැහැ — තරහ නිවෙන්න එකිනෙකාට වෙලාව දෙන්න, එකිනෙකාගේ වේගයට ඉවසීමෙන් ඉඩ දෙන්න.' },
  },
  Yoni: {
    plainName: { en: 'Physical Closeness', si: 'ශාරීරික සමීපකම' },
    techName: { en: 'Yoni Porondam', si: 'යෝනි පොරොන්දම' },
    short: { en: 'Closeness', si: 'සමීපකම' },
    what: { en: 'This checks the natural physical attraction between you, and how easily closeness comes.', si: 'මෙයින් බලන්නේ දෙදෙනා අතර ස්වාභාවික ශාරීරික ආකර්ෂණය සහ සමීප වීමේ පහසුව ගැනයි.' },
    good: { en: 'A strong natural attraction. Physical and emotional closeness come easily for you two.', si: 'ස්වාභාවික ආකර්ෂණය හොඳටම තිබෙනවා. ශාරීරික සහ හිතේ සමීපකම දෙකම ඔබ දෙදෙනාට පහසුවෙන් ලැබෙනවා.' },
    mixed: { en: 'The attraction is real, but it needs time and care to stay strong. Unhurried time alone together helps a lot.', si: 'ආකර්ෂණය ඇත්තටම තිබෙනවා. නමුත් එය දිගටම තියාගන්න කාලය සහ සැලකිල්ල ඕනෑ. හදිසි නොවී දෙදෙනාම එකට ගත කරන කාලය ලොකු උදව්වක්.' },
    poor: { en: 'Closeness may not come by itself. Talk openly and kindly about what each of you needs — that honest talk is what builds it.', si: 'සමීපකම ඉබේම නොඑන්න පුළුවන්. එකිනෙකාට අවශ්‍ය දේ ගැන විවෘතව, කරුණාවෙන් කතා කරන්න — ඒ අවංක කතාබහෙන් තමයි එය ගොඩනැගෙන්නේ.' },
  },
  Rashi: {
    plainName: { en: 'Understanding Feelings', si: 'හැඟීම් තේරුම් ගැනීම' },
    techName: { en: 'Rashi Porondam', si: 'රාශි පොරොන්දම' },
    short: { en: 'Feelings', si: 'හැඟීම්' },
    what: { en: 'This checks how easily you understand each other’s feelings and moods.', si: 'මෙයින් බලන්නේ එකිනෙකාගේ හැඟීම් සහ මනෝභාව කොතරම් පහසුවෙන් තේරුම් ගන්නවාද කියායි.' },
    good: { en: 'You understand each other’s feelings without long explanations. Home will feel calm and safe.', si: 'දිග පැහැදිලි කිරීම් නැතුවම ඔබ එකිනෙකාගේ හැඟීම් තේරුම් ගන්නවා. නිවස සන්සුන්, ආරක්ෂිත තැනක් වගේ දැනේවි.' },
    mixed: { en: 'You feel things differently. Simply saying “this is how I feel” early stops silent distance from growing.', si: 'දෙදෙනා හැඟීම් විඳින විදිය වෙනස්. “මට දැනෙන්නේ මෙහෙමයි” කියා කලින්ම කීවොත්, නිහඬ දුරස්කමක් වැඩෙන එක නවතිනවා.' },
    poor: { en: 'Your emotional styles are far apart. Listen patiently instead of guessing — asking “what do you feel?” works far better than assuming.', si: 'දෙදෙනාගේ හැඟීම් රටා තරමක් දුරයි. අනුමාන නොකර ඉවසීමෙන් සවන් දෙන්න — “ඔබට මොකද දැනෙන්නේ?” කියා ඇසීම, හිතාගැනීමට වඩා හොඳින් වැඩ කරනවා.' },
  },
  Vasya: {
    plainName: { en: 'Pull Toward Each Other', si: 'එකිනෙකාට ඇදෙන බව' },
    techName: { en: 'Vasya Porondam', si: 'වශ්‍ය පොරොන්දම' },
    short: { en: 'Pull', si: 'ඇදීම' },
    what: { en: 'This checks the natural pull between you — how willingly you listen to and go along with each other.', si: 'මෙයින් බලන්නේ දෙදෙනා අතර ස්වාභාවික ඇදීම — එකිනෙකාට කැමැත්තෙන් සවන් දෙන, එකඟ වන ගතිය ගැනයි.' },
    good: { en: 'A strong, willing pull toward each other. You soften each other, and agreeing feels natural.', si: 'එකිනෙකාට කැමැත්තෙන්ම ඇදෙන ප්‍රබල බැඳීමක්. ඔබ එකිනෙකාව මෘදු කරනවා — එකඟ වීම ඉබේම සිදු වෙනවා.' },
    mixed: { en: 'One of you tends to lead more. Take turns — when both feel heard, respect stays strong.', si: 'එක් අයෙක් වැඩිපුර මූලිකත්වය ගන්නවා. මාරුවෙන් මාරුවට ඉඩ දෙන්න — දෙදෙනාටම ඇහුම්කන් ලැබෙනවා යැයි දැනුණොත් ගෞරවය රැකෙනවා.' },
    poor: { en: 'The natural pull is quiet here. That’s okay — the bond stays strong when you choose to care for each other on purpose, every day.', si: 'ස්වාභාවික ඇදීම මෙහි අඩුයි. ඒක ප්‍රශ්නයක් නොවේ — දවසින් දවස හිතාමතාම එකිනෙකාට සැලකුවොත් බැඳීම ශක්තිමත්ව තියාගන්න පුළුවන්.' },
  },
  Nadi: {
    plainName: { en: 'Health of Children & Family', si: 'දරුවන්ගේ සහ පවුලේ සෞඛ්‍යය' },
    techName: { en: 'Nadi Porondam', si: 'නාඩි පොරොන්දම' },
    short: { en: 'Health', si: 'නාඩි' },
    what: { en: 'In tradition this is one of the most important checks — it looks at the health of the family line and future children.', si: 'සම්ප්‍රදායේ වැදගත්ම පරීක්ෂාවලින් එකක් මෙයයි — ඉදිරි පරම්පරාවේ, එනම් දරුවන්ගේ සෞඛ්‍යය ගැන බලනවා.' },
    good: { en: 'This lines up well — traditionally a very good sign for healthy children and a healthy family.', si: 'මෙය හොඳින් ගැළපෙනවා — නිරෝගී දරුවන්ට සහ නිරෝගී පවුලකට ඉතා හොඳ ලකුණක් ලෙසයි සම්ප්‍රදායේ සලකන්නේ.' },
    mixed: { en: 'A middle result. Good habits and regular medical check-ups keep this side well covered.', si: 'මධ්‍යම ප්‍රතිඵලයක්. හොඳ පුරුදු සහ නියමිත වෛද්‍ය පරීක්ෂණවලින් මේ පැත්ත හොඳින් බලාගන්න පුළුවන්.' },
    poor: { en: 'Tradition treats this signal seriously. It is worth showing both horoscopes to an experienced astrologer, who can weigh it with everything else.', si: 'මේ ලකුණ සම්ප්‍රදායේ බැරෑරුම්ව සලකනවා. කේන්දර දෙකම පළපුරුදු ජ්‍යෝතිෂවේදියෙකුට පෙන්වා, අනෙක් සියල්ල සමඟ කිරා බලා ගැනීම වටිනවා.' },
  },
  Mahendra: {
    plainName: { en: 'Growing & Doing Well Together', si: 'එකට දියුණු වීම' },
    techName: { en: 'Mahendra Porondam', si: 'මහේන්ද්‍ර පොරොන්දම' },
    short: { en: 'Growth', si: 'දියුණුව' },
    what: { en: 'This checks support for prosperity — income, progress, and the blessing of children.', si: 'මෙයින් බලන්නේ දියුණුවට ඇති සහයෝගයයි — ආදායම, ඉදිරි ගමන සහ දරු භාග්‍යය.' },
    good: { en: 'Good support for growing together — your efforts tend to add up instead of pulling apart.', si: 'එකට දියුණු වීමට හොඳ සහයක් තිබෙනවා — දෙදෙනාගේ උත්සාහය එකට එකතු වෙනවා මිස, විසිරෙන්නේ නැහැ.' },
    mixed: { en: 'Progress will come from planning together. Decide your goals as a pair and write them down — it truly helps.', si: 'දියුණුව එන්නේ එකට සැලසුම් කිරීමෙන්. අරමුණු දෙදෙනාම එකතු වී තීරණය කර ලියා තබාගන්න — එය ඇත්තටම උදව් වෙනවා.' },
    poor: { en: 'Success won’t come on its own here — it comes when you actively support each other’s work and dreams.', si: 'මෙහි සාර්ථකත්වය ඉබේම එන්නේ නැහැ — එකිනෙකාගේ රැකියාවට සහ සිහිනවලට සක්‍රියව උදව් කරන විට තමයි එය එන්නේ.' },
  },
  Rajju: {
    plainName: { en: 'Long Life of the Marriage', si: 'විවාහයේ දිගු පැවැත්ම' },
    techName: { en: 'Rajju Porondam', si: 'රජ්ජු පොරොන්දම' },
    short: { en: 'Lasting', si: 'පැවැත්ම' },
    what: { en: 'Tradition treats this as the most serious check — it reads the long life and stability of the marriage itself.', si: 'සම්ප්‍රදායේ වඩාත්ම බැරෑරුම් පරීක්ෂාව මෙයයි — විවාහයේ දිගු පැවැත්ම සහ ස්ථාවර බව ගැන බලනවා.' },
    good: { en: 'Your rajju groups are different — traditionally the strongest sign of a long, steady marriage.', si: 'දෙදෙනාගේ රජ්ජු කාණ්ඩ වෙනස් — දිගු, ස්ථාවර විවාහයකට සම්ප්‍රදායේ තිබෙන ප්‍රබලම හොඳ ලකුණ.' },
    mixed: { en: 'A partial result — worth a closer look from an experienced astrologer.', si: 'අර්ධ ප්‍රතිඵලයක් — පළපුරුදු ජ්‍යෝතිෂවේදියෙකු ලවා සමීපව බලවා ගැනීම වටිනවා.' },
    poor: { en: 'You share the same rajju group. This is the one signal tradition takes most seriously — families usually show both horoscopes to an experienced astrologer before deciding.', si: 'දෙදෙනාම එකම රජ්ජු කාණ්ඩයේ. සම්ප්‍රදායේ වඩාත්ම බැරෑරුම්ව සලකන ලකුණ මෙයයි — සාමාන්‍යයෙන් පවුල් තීරණයකට පෙර කේන්දර දෙකම පළපුරුදු ජ්‍යෝතිෂවේදියෙකුට පෙන්වනවා.' },
  },
  Vedha: {
    plainName: { en: 'No Blocking Stars', si: 'බාධා නැති බව' },
    techName: { en: 'Vedha Porondam', si: 'වේධ පොරොන්දම' },
    short: { en: 'Clear', si: 'බාධා' },
    what: { en: 'This checks that your two birth stars do not block each other.', si: 'මෙයින් බලන්නේ දෙදෙනාගේ උපන් නැකැත් එකිනෙකාට බාධා නොකරනවාද කියායි.' },
    good: { en: 'No blocking — your birth stars leave the road clear for each other.', si: 'බාධාවක් නැහැ — දෙදෙනාගේ නැකැත් එකිනෙකාට ඉඩ දී, මග නිදහස්ව තබනවා.' },
    mixed: { en: 'A small crossing — being aware of it is enough to keep things smooth.', si: 'පොඩි හරස්වීමක් තිබෙනවා — ඒ ගැන දැනුවත්ව සිටීමම ප්‍රමාණවත්.' },
    poor: { en: 'Your birth stars push against each other — tradition takes this seriously, so an experienced astrologer should weigh it with the full picture.', si: 'දෙදෙනාගේ නැකැත් එකිනෙකාට විරුද්ධව අදිනවා — සම්ප්‍රදායේ මෙය බැරෑරුම් ලකුණක්. සම්පූර්ණ චිත්‍රය සමඟ කිරා බලන්න පළපුරුදු ජ්‍යෝතිෂවේදියෙකු හමුවෙන්න.' },
  },
};

function getSignalCopy(name, language, score, maxScore) {
  var pct = maxScore > 0 ? score / maxScore : 0;
  var tier = pct >= 0.75 ? 'good' : pct >= 0.25 ? 'mixed' : 'poor';
  var lang = language === 'si' ? 'si' : 'en';
  var tierLabel = tier === 'good'
    ? (lang === 'si' ? 'හොඳින් ගැළපේ' : 'Matches well')
    : tier === 'mixed'
      ? (lang === 'si' ? 'මධ්‍යමයි' : 'In between')
      : (lang === 'si' ? 'අවධානය ඕනෑ' : 'Needs attention');
  var sc = SIGNAL_COPY[name];
  if (!sc) {
    return { plainName: name, techName: name + ' Porondam', shortName: name, what: '', insight: '', tier: tier, tierLabel: tierLabel, color: TIER_COLORS[tier] };
  }
  return {
    plainName: sc.plainName[lang],
    techName: sc.techName[lang],
    shortName: sc.short[lang],
    what: sc.what[lang],
    insight: sc[tier][lang],
    tier: tier,
    tierLabel: tierLabel,
    color: TIER_COLORS[tier],
  };
}

function getRelationshipChallengeCopy(item, language) {
  var severity = item && item.severity ? String(item.severity).toLowerCase() : '';
  var name = item && item.name ? String(item.name).toLowerCase() : '';

  // Map dosha names to plain-language relationship labels + descriptions
  var challengeMap = {
    mangal: {
      si: { label: 'චර්යාව හා කෝපය පාලනය', desc: 'එක් අයකුගේ තීව්‍ර ශක්තිය නිසා ඉක්මනින් කේන්ති ගැනීම හෝ ආධිපත්‍ය පැවරීම විය හැක. ඉවසීමෙන් කතා කිරීම වැදගත්.' },
      en: { label: 'Temperament & Anger Control', desc: 'One partner may have intense energy leading to quick reactions or dominance. Patient communication is key.' },
    },
    kaal: {
      si: { label: 'ජීවිතයේ හදිසි මාරු', desc: 'ජීවිතයේ අනපේක්ෂිත වෙනස්කම් එකින් එක පැමිණිය හැක. එකිනෙකා සවිමත්ව රැඳී සිටීම වැදගත්.' },
      en: { label: 'Sudden Life Shifts', desc: 'Life may bring unexpected changes one after another. Staying resilient together is important.' },
    },
    sade: {
      si: { label: 'ජීවිතයේ අභියෝගකාරී කාල පරිච්ඡේදය', desc: 'දැනට අභියෝගකාරී කාලයක ගමන් කරමින් සිටී. අන්‍යෝන්‍ය උදව් හා ඉවසීම ඉතා වැදගත්.' },
      en: { label: 'Challenging Life Phase', desc: 'Currently going through a demanding period. Mutual support and patience are crucial.' },
    },
    pitru: {
      si: { label: 'පවුල් රටා හා උරුමය', desc: 'පවුලේ පරම්පරාවෙන් ආ සබඳතා රටා බලපෑම් කළ හැක. අලුත් පුරුදු ගොඩනගා ගැනීම හොඳයි.' },
      en: { label: 'Family Patterns & Legacy', desc: 'Inherited family relationship patterns may influence the bond. Building new habits together helps.' },
    },
    grahan: {
      si: { label: 'මානසික පීඩනය හා අවිනිශ්චිතභාවය', desc: 'සිතේ ව්‍යාකූලත්වය හෝ තීරණ ගැනීමේ දුෂ්කරතා ඇති විය හැක. පැහැදිලි සන්නිවේදනය අත්‍යවශ්‍යයි.' },
      en: { label: 'Mental Pressure & Confusion', desc: 'There may be confusion or difficulty making decisions together. Clear communication is essential.' },
    },
    shrapit: {
      si: { label: 'පැරණි හැඟීම්මය බැමි', desc: 'අතීත සබඳතා අත්දැකීම් නිසා පැවරෙන බිය හෝ විශ්වාස ගැටලු විය හැක. අලුත් ආරම්භයක් ගොඩනගන්න.' },
      en: { label: 'Emotional Baggage from the Past', desc: 'Past relationship experiences may carry fear or trust issues. Focus on building a fresh start.' },
    },
    guru: {
      si: { label: 'විවේකය හා නුවණ යොදා ගැනීම', desc: 'සමහරවිට නොමේරූ තීරණ ගැනීමට නැඹුරුවක් ඇත. වැදගත් කරුණු ගැන හිතාමතා සාකච්ඡා කරන්න.' },
      en: { label: 'Wisdom & Judgement', desc: 'There may be a tendency toward impulsive decisions. Important matters need deliberate discussion.' },
    },
    kemdrum: {
      si: { label: 'තනිකම හා හැඟීම්මය හුදෙකලාව', desc: 'එක් පාර්ශවයකට හැඟීම්මය වශයෙන් හුදෙකලා වූ හැඟීමක් ඇති විය හැක. සැලකිල්ල ප්‍රකාශ කිරීම අමතක නොකරන්න.' },
      en: { label: 'Emotional Isolation', desc: 'One partner may sometimes feel emotionally alone. Regularly expressing care is vital.' },
    },
  };

  // Find matching challenge by key
  var matchedKey = Object.keys(challengeMap).find(function(k) { return name.indexOf(k) !== -1; });
  var mapped = matchedKey ? challengeMap[matchedKey] : null;

  if (item && item.cancelled) {
    if (language === 'si') {
      return {
        label: mapped ? mapped.si.label + ' — නිවාරණය වී ඇත' : 'සැලකිල්ල අඩු වූ කරුණ',
        desc: 'මේ බලපෑම සැලකිය යුතු ලෙස අඩු වී ඇත. සාමාන්‍ය සැලකිල්ලෙන් ප්‍රමාණවත්.',
      };
    }
    return {
      label: mapped ? mapped.en.label + ' — Resolved' : 'Reduced Care Point',
      desc: 'This influence has been significantly reduced. Normal care is sufficient.',
    };
  }

  if (mapped) {
    return language === 'si' ? mapped.si : mapped.en;
  }

  // Fallback for unmapped dosha types
  if (language === 'si') {
    return {
      label: severity.indexOf('severe') !== -1 ? 'වැඩි සැලකිල්ලක් අවශ්‍ය කරුණ' : 'සබඳතාවේ සැලකිලිමත් කරුණ',
      desc: 'මෙය සබඳතාවේ ඉවසීම, විශ්වාසය සහ තීරණ ගැනීමේදී වැඩි සැලකිල්ලක් අවශ්‍ය බව පෙන්වනවා.',
    };
  }
  return {
    label: severity.indexOf('severe') !== -1 ? 'High-Care Relationship Point' : 'Relationship Care Point',
    desc: 'This suggests an area where patience, trust, and careful decisions are important for the relationship.',
  };
}

function LoadingParticle({ particle, skipAnim }) {
  var opacity = useSharedValue(particle.baseOpacity);
  var drift = useSharedValue(0);

  useEffect(function () {
    if (skipAnim) {
      cancelAnimation(opacity); cancelAnimation(drift);
      opacity.value = particle.baseOpacity;
      drift.value = 0;
      return;
    }
    opacity.value = withDelay(particle.delay, withRepeat(withSequence(
      withTiming(Math.min(0.9, particle.baseOpacity + 0.35), { duration: particle.speed * 0.45, easing: Easing.inOut(Easing.sin) }),
      withTiming(0.08, { duration: particle.speed * 0.55, easing: Easing.inOut(Easing.sin) })
    ), -1, true));
    drift.value = withDelay(particle.delay / 2, withRepeat(withSequence(
      withTiming(1, { duration: particle.speed, easing: Easing.inOut(Easing.sin) }),
      withTiming(0, { duration: particle.speed, easing: Easing.inOut(Easing.sin) })
    ), -1, true));
    return function () { cancelAnimation(opacity); cancelAnimation(drift); };
  }, [skipAnim]);

  var style = useAnimatedStyle(function () {
    return {
      opacity: opacity.value,
      transform: [
        { translateY: interpolate(drift.value, [0, 1], [0, -particle.drift]) },
        { scale: interpolate(opacity.value, [0.08, 0.9], [0.75, 1.35]) },
      ],
    };
  });

  return (
    <Animated.View style={[{
      position: 'absolute', left: particle.x + '%', top: particle.y + '%',
      width: particle.size, height: particle.size, borderRadius: particle.size / 2,
      backgroundColor: particle.color,
      shadowColor: particle.color, shadowOpacity: 0.8, shadowRadius: particle.size * 2,
      shadowOffset: { width: 0, height: 0 },
    }, style]} />
  );
}

function ZodiacOrbitNode({ source, index, total, radius, rotation, size }) {
  var baseAngle = (Math.PI * 2 / total) * index - Math.PI / 2;
  var style = useAnimatedStyle(function () {
    var angle = baseAngle + rotation.value;
    return {
      transform: [
        { translateX: Math.cos(angle) * radius },
        { translateY: Math.sin(angle) * radius },
        { rotate: (-rotation.value) + 'rad' },
      ],
      opacity: interpolate(Math.sin(angle), [-1, 1], [0.5, 1]),
    };
  });

  return (
    <Animated.View style={[lsStyles.zodiacNode, { width: size, height: size, borderRadius: size / 2 }, style]}>
      <Image source={source} style={{ width: size * 0.78, height: size * 0.78 }} resizeMode="contain" />
    </Animated.View>
  );
}

function PartnerStar({ name, fallback, color, accent, orbit, side, radiusX, radiusY }) {
  var label = name && String(name).trim() ? String(name).trim() : fallback;
  var initial = label ? label.charAt(0).toUpperCase() : '?';
  var style = useAnimatedStyle(function () {
    var angle = orbit.value + side;
    return {
      transform: [
        { translateX: Math.cos(angle) * radiusX },
        { translateY: Math.sin(angle) * radiusY },
        { scale: interpolate(Math.sin(angle), [-1, 1], [0.92, 1.08]) },
      ],
    };
  });

  return (
    <Animated.View style={[lsStyles.partnerStar, { borderColor: color + 'AA', shadowColor: color }, style]}>
      <LinearGradient colors={[color + 'EE', accent + 'CC', 'rgba(12,6,20,0.92)']} style={lsStyles.partnerStarFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <Text style={lsStyles.partnerInitial}>{initial}</Text>
    </Animated.View>
  );
}

function PorondamSignalChip({ signal, index, activeIndex, language }) {
  var isActive = index === activeIndex;
  var isDone = index < activeIndex;
  var label = language === 'si' ? signal.si : signal.en;
  var color = isActive || isDone ? signal.color : 'rgba(255,232,176,0.34)';
  return (
    <View style={[
      lsStyles.signalChip,
      isActive && { borderColor: signal.color + 'AA', backgroundColor: signal.color + '1F' },
      isDone && { borderColor: signal.color + '55', backgroundColor: signal.color + '10' },
    ]}>
      <Ionicons name={isDone ? 'checkmark-circle' : signal.icon} size={13} color={color} />
      <Text style={[lsStyles.signalText, { color: color }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function PorondamCosmicLoader({ brideName, groomName, language, reduced, lowEnd }) {
  var lang = language || 'en';
  var stages = PORONDAM_LOADING_STAGES[lang] || PORONDAM_LOADING_STAGES.en;
  var skipAnim = !!(reduced || lowEnd);
  var [stageIndex, setStageIndex] = useState(0);

  var wheelRotation = useSharedValue(0);
  var reverseRotation = useSharedValue(0);
  var partnerOrbit = useSharedValue(-Math.PI / 2);
  var corePulse = useSharedValue(1);
  var auraPulse = useSharedValue(0.35);
  var sweep = useSharedValue(0);
  var entrance = useSharedValue(0);

  useEffect(function () {
    entrance.value = withTiming(1, { duration: skipAnim ? 1 : 700, easing: Easing.out(Easing.cubic) });
    if (skipAnim) {
      cancelAnimation(wheelRotation); cancelAnimation(reverseRotation); cancelAnimation(partnerOrbit);
      cancelAnimation(corePulse); cancelAnimation(auraPulse); cancelAnimation(sweep);
      wheelRotation.value = 0; reverseRotation.value = 0; partnerOrbit.value = -Math.PI / 2;
      corePulse.value = 1; auraPulse.value = 0.42; sweep.value = 0.2;
    } else {
      wheelRotation.value = withRepeat(withTiming(Math.PI * 2, { duration: 26000, easing: Easing.linear }), -1, false);
      reverseRotation.value = withRepeat(withTiming(-Math.PI * 2, { duration: 18000, easing: Easing.linear }), -1, false);
      partnerOrbit.value = withRepeat(withTiming(Math.PI * 1.5, { duration: 6200, easing: Easing.linear }), -1, false);
      corePulse.value = withRepeat(withSequence(
        withTiming(1.08, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.94, { duration: 1500, easing: Easing.inOut(Easing.sin) })
      ), -1, true);
      auraPulse.value = withRepeat(withSequence(
        withTiming(0.75, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.28, { duration: 1800, easing: Easing.inOut(Easing.sin) })
      ), -1, true);
      sweep.value = withRepeat(withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.cubic) }), -1, false);
    }

    var interval = setInterval(function () {
      setStageIndex(function (prev) { return (prev + 1) % stages.length; });
    }, 3300);
    return function () {
      clearInterval(interval);
      cancelAnimation(wheelRotation); cancelAnimation(reverseRotation); cancelAnimation(partnerOrbit);
      cancelAnimation(corePulse); cancelAnimation(auraPulse); cancelAnimation(sweep); cancelAnimation(entrance);
    };
  }, [skipAnim, stages.length]);

  var sealSize = Math.min(W - (WIDE ? 116 : 44), WIDE ? 340 : Math.min(280, H * 0.32));
  var zodiacSize = Math.max(23, sealSize * 0.085);
  var zodiacRadius = sealSize * 0.41;
  var partnerRadiusX = sealSize * 0.255;
  var partnerRadiusY = sealSize * 0.12;
  var activeSignal = Math.min(PORONDAM_SIGNAL_TRACK.length - 1, Math.floor((stageIndex / Math.max(1, stages.length - 1)) * PORONDAM_SIGNAL_TRACK.length));
  var progressPct = ((stageIndex + 1) / stages.length) * 100;
  var stage = stages[stageIndex];
  var brideLabel = brideName && String(brideName).trim() ? String(brideName).trim() : (lang === 'si' ? 'මනාලිය' : 'Bride');
  var groomLabel = groomName && String(groomName).trim() ? String(groomName).trim() : (lang === 'si' ? 'මනාලයා' : 'Groom');
  var particleSet = skipAnim ? PORONDAM_LOADING_PARTICLES.slice(0, 12) : PORONDAM_LOADING_PARTICLES;
  var mandalaLines = [];
  var center = sealSize / 2;
  for (var i = 0; i < 24; i++) {
    var angle = (Math.PI * 2 / 24) * i;
    mandalaLines.push(
      <Line
        key={'line' + i}
        x1={center + Math.cos(angle) * sealSize * 0.18}
        y1={center + Math.sin(angle) * sealSize * 0.18}
        x2={center + Math.cos(angle) * sealSize * 0.43}
        y2={center + Math.sin(angle) * sealSize * 0.43}
        stroke={i % 2 === 0 ? '#FBBF24' : '#C084FC'}
        strokeOpacity={i % 3 === 0 ? 0.34 : 0.18}
        strokeWidth={i % 2 === 0 ? 1.2 : 0.7}
      />
    );
  }

  var entranceStyle = useAnimatedStyle(function () {
    return {
      opacity: entrance.value,
      transform: [{ translateY: interpolate(entrance.value, [0, 1], [18, 0]) }],
    };
  });
  var wheelStyle = useAnimatedStyle(function () { return { transform: [{ rotate: wheelRotation.value + 'rad' }] }; });
  var reverseWheelStyle = useAnimatedStyle(function () { return { transform: [{ rotate: reverseRotation.value + 'rad' }] }; });
  var coreStyle = useAnimatedStyle(function () { return { transform: [{ scale: corePulse.value }] }; });
  var auraStyle = useAnimatedStyle(function () {
    return {
      opacity: auraPulse.value,
      transform: [{ scale: interpolate(auraPulse.value, [0.28, 0.75], [0.9, 1.12]) }],
    };
  });
  var sweepStyle = useAnimatedStyle(function () {
    return {
      opacity: skipAnim ? 0.18 : interpolate(sweep.value, [0, 0.25, 0.75, 1], [0, 0.7, 0.7, 0]),
      transform: [{ translateX: interpolate(sweep.value, [0, 1], [-sealSize * 0.55, sealSize * 0.55]) }, { rotate: '-18deg' }],
    };
  });

  return (
    <Animated.View entering={skipAnim ? undefined : FadeIn.duration(500)} style={[lsStyles.container, entranceStyle]}>
      <View style={lsStyles.particleField} pointerEvents="none">
        {particleSet.map(function (particle, i) { return <LoadingParticle key={'lp' + i} particle={particle} skipAnim={skipAnim} />; })}
      </View>

      <View style={lsStyles.kickerPill}>
        <Ionicons name="sparkles" size={13} color="#FBBF24" />
        <Text style={lsStyles.kickerText}>{lang === 'si' ? 'පොරොන්දම් කියවීම' : 'Love Compatibility'}</Text>
      </View>

      <Text style={lsStyles.loadingTitle}>{lang === 'si' ? 'ගැළපීම සකසමින්' : 'Reading Your Stars'}</Text>

      <View style={lsStyles.nameRail}>
        <View style={[lsStyles.nameCard, { borderColor: 'rgba(249,168,212,0.28)', backgroundColor: 'rgba(249,168,212,0.08)' }]}>
          <Text style={[lsStyles.nameRole, { color: '#F9A8D4' }]}>{lang === 'si' ? 'මනාලිය' : 'Bride'}</Text>
          <Text style={lsStyles.nameText} numberOfLines={1}>{brideLabel}</Text>
        </View>
        <View style={lsStyles.nameBridge}>
          <Ionicons name="heart" size={16} color="#FFB800" />
        </View>
        <View style={[lsStyles.nameCard, { borderColor: 'rgba(147,197,253,0.28)', backgroundColor: 'rgba(147,197,253,0.08)' }]}>
          <Text style={[lsStyles.nameRole, { color: '#93C5FD' }]}>{lang === 'si' ? 'මනාලයා' : 'Groom'}</Text>
          <Text style={lsStyles.nameText} numberOfLines={1}>{groomLabel}</Text>
        </View>
      </View>

      <View style={[lsStyles.seal, { width: sealSize, height: sealSize, borderRadius: sealSize / 2 }]}>
        <Animated.View style={[lsStyles.sealAura, { width: sealSize * 0.86, height: sealSize * 0.86, borderRadius: sealSize * 0.43 }, auraStyle]}>
          <LinearGradient colors={['rgba(255,184,0,0.24)', 'rgba(244,114,182,0.16)', 'rgba(96,165,250,0.10)']} style={StyleSheet.absoluteFill} />
        </Animated.View>

        <Animated.View style={[StyleSheet.absoluteFillObject, wheelStyle]}>
          <Svg width={sealSize} height={sealSize}>
            <Defs>
              <SvgLinearGradient id="porondamGold" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#FBBF24" stopOpacity="0.95" />
                <Stop offset="0.52" stopColor="#F472B6" stopOpacity="0.7" />
                <Stop offset="1" stopColor="#60A5FA" stopOpacity="0.8" />
              </SvgLinearGradient>
            </Defs>
            <G>
              <Circle cx={center} cy={center} r={sealSize * 0.45} stroke="url(#porondamGold)" strokeWidth="1.5" strokeDasharray="5 11" fill="none" opacity="0.9" />
              <Circle cx={center} cy={center} r={sealSize * 0.34} stroke="#FBBF24" strokeWidth="0.8" strokeDasharray="2 7" fill="none" opacity="0.32" />
              <Circle cx={center} cy={center} r={sealSize * 0.22} stroke="#C084FC" strokeWidth="0.9" fill="none" opacity="0.34" />
              {mandalaLines}
            </G>
          </Svg>
        </Animated.View>

        <Animated.View style={[lsStyles.innerGeometry, reverseWheelStyle]}>
          <View style={lsStyles.geometryLine} />
          <View style={[lsStyles.geometryLine, { transform: [{ rotate: '60deg' }] }]} />
          <View style={[lsStyles.geometryLine, { transform: [{ rotate: '120deg' }] }]} />
        </Animated.View>

        {ZODIAC_IMAGE_LIST.map(function (source, i) {
          return <ZodiacOrbitNode key={'z' + i} source={source} index={i} total={ZODIAC_IMAGE_LIST.length} radius={zodiacRadius} rotation={wheelRotation} size={zodiacSize} />;
        })}

        <View style={[lsStyles.partnerTrack, { width: sealSize * 0.58, height: sealSize * 0.28, borderRadius: sealSize * 0.14 }]} />
        <PartnerStar name={brideName} fallback={lang === 'si' ? 'මනාලිය' : 'Bride'} color="#F9A8D4" accent="#EC4899" orbit={partnerOrbit} side={0} radiusX={partnerRadiusX} radiusY={partnerRadiusY} />
        <PartnerStar name={groomName} fallback={lang === 'si' ? 'මනාලයා' : 'Groom'} color="#93C5FD" accent="#3B82F6" orbit={partnerOrbit} side={Math.PI} radiusX={partnerRadiusX} radiusY={partnerRadiusY} />

        <Animated.View style={[lsStyles.coreSeal, coreStyle]}>
          <LinearGradient colors={['rgba(255,184,0,0.95)', 'rgba(255,140,0,0.82)', 'rgba(124,58,237,0.86)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <View style={lsStyles.coreInner}>
            <Ionicons name="heart" size={30} color="#FFF7D6" />
          </View>
          <Animated.View style={[lsStyles.coreSweep, sweepStyle]} />
        </Animated.View>
      </View>

      <Animated.View key={'stage' + stageIndex} entering={skipAnim ? undefined : FadeInUp.duration(420)} style={lsStyles.textWrap}>
        <View style={lsStyles.stageIcon}>
          <Ionicons name={stage.icon} size={18} color="#FFB800" />
        </View>
        <Text style={lsStyles.stageText}>{stage.title}</Text>
        <Text style={lsStyles.stageSub}>{stage.sub}</Text>
      </Animated.View>

      <View style={lsStyles.signalGrid}>
        {PORONDAM_SIGNAL_TRACK.map(function (signal, i) {
          return <PorondamSignalChip key={signal.en} signal={signal} index={i} activeIndex={activeSignal} language={lang} />;
        })}
      </View>

      <View style={lsStyles.progressRow}>
        <View style={lsStyles.progressHeader}>
          <Text style={lsStyles.progressLabel}>{lang === 'si' ? 'ගණනය වෙමින්' : 'Analysing'}</Text>
          <Text style={lsStyles.progressCount}>{stageIndex + 1}/{stages.length}</Text>
        </View>
        <View style={lsStyles.progressBar}>
          <LinearGradient colors={['#F9A8D4', '#FFB800', '#60A5FA']}
            style={[lsStyles.progressFill, { width: progressPct + '%' }]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
        </View>
        <Text style={lsStyles.progressHint}>{lang === 'si' ? 'තත්පර කිහිපයක් ගත වේ' : 'Good things take a moment'}</Text>
      </View>
    </Animated.View>
  );
}

var lsStyles = StyleSheet.create({
  loadingScreen: { flexGrow: 1, minHeight: H * 0.9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: WIDE ? 38 : 12 },
  container: { width: '100%', maxWidth: 520, alignItems: 'center', paddingHorizontal: 18, paddingVertical: WIDE ? 24 : 14 },
  particleField: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  kickerPill: {
    flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, paddingVertical: 7,
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(251,191,36,0.28)',
    backgroundColor: 'rgba(255,184,0,0.08)', marginBottom: 12,
  },
  kickerText: { color: 'rgba(255,232,176,0.72)', fontSize: 11, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },
  loadingTitle: {
    color: '#FFF1D0', fontSize: WIDE ? 28 : 23, fontWeight: '900', textAlign: 'center', marginBottom: 14,
    letterSpacing: 0, ...textShadow('rgba(255,184,0,0.36)', { width: 0, height: 2 }, 12),
  },
  nameRail: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: WIDE ? 16 : 10 },
  nameCard: {
    flex: 1, minHeight: 58, maxWidth: 190, borderRadius: 16, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center', overflow: 'hidden',
  },
  nameRole: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 },
  nameText: { color: '#FFE8B0', fontSize: 14, fontWeight: '800' },
  nameBridge: {
    width: 38, height: 38, borderRadius: 19, marginHorizontal: 7, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,184,0,0.10)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.30)',
    ...boxShadow('#FFB800', { width: 0, height: 0 }, 0.55, 9), elevation: 7,
  },
  seal: { alignItems: 'center', justifyContent: 'center', marginVertical: WIDE ? 8 : 4 },
  sealAura: { position: 'absolute', overflow: 'hidden' },
  zodiacNode: {
    position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1, borderColor: 'rgba(255,232,176,0.12)', ...boxShadow('rgba(251,191,36,0.38)', { width: 0, height: 0 }, 0.45, 6), elevation: 4,
  },
  innerGeometry: { position: 'absolute', width: '45%', height: '45%', alignItems: 'center', justifyContent: 'center', opacity: 0.36 },
  geometryLine: { position: 'absolute', width: '100%', height: 1, backgroundColor: 'rgba(255,232,176,0.35)' },
  partnerTrack: { position: 'absolute', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,232,176,0.18)', transform: [{ rotate: '-10deg' }] },
  partnerStar: {
    position: 'absolute', width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    borderWidth: 2, shadowOpacity: 0.82, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, elevation: 12,
  },
  partnerStarFill: { ...StyleSheet.absoluteFillObject, borderRadius: 26 },
  partnerInitial: { color: '#FFF7D6', fontSize: 20, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 5, textShadowOffset: { width: 0, height: 1 } },
  coreSeal: {
    width: 82, height: 82, borderRadius: 41, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    borderWidth: 2, borderColor: 'rgba(255,247,214,0.45)', ...boxShadow('#FFB800', { width: 0, height: 0 }, 0.9, 24), elevation: 16,
  },
  coreInner: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,8,30,0.36)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  coreSweep: { position: 'absolute', width: 34, height: 120, backgroundColor: 'rgba(255,255,255,0.24)' },
  textWrap: { width: '100%', minHeight: 90, alignItems: 'center', justifyContent: 'flex-start', marginTop: WIDE ? 10 : 4, marginBottom: 8 },
  stageIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 8, backgroundColor: 'rgba(255,184,0,0.10)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.22)' },
  stageText: { color: '#FFE8B0', fontSize: 17, fontWeight: '900', textAlign: 'center', marginBottom: 7, lineHeight: 23, letterSpacing: 0 },
  stageSub: { color: 'rgba(255,232,176,0.58)', fontSize: 12, textAlign: 'center', lineHeight: 18, paddingHorizontal: WIDE ? 36 : 10, maxWidth: 430 },
  signalGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 7, marginBottom: 16 },
  signalChip: {
    height: 30, minWidth: 78, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.035)', paddingHorizontal: 9,
  },
  signalText: { fontSize: 11, fontWeight: '800' },
  progressRow: { width: '100%', maxWidth: 390, alignItems: 'stretch' },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  progressLabel: { color: 'rgba(255,232,176,0.62)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 },
  progressCount: { color: '#FFB800', fontSize: 11, fontWeight: '900' },
  progressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressHint: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 9 },
});

// ═══════════════════════════════════════════════════════════════
// REPORT DESIGN SYSTEM — "a wise elder, in a calm room"
// One verdict, numbered chapters, plain words first, classical
// names as the credential. Care-amber instead of alarm-red.
// ═══════════════════════════════════════════════════════════════
var INK = {
  title: '#F6E4B8',
  body: 'rgba(255,241,208,0.84)',
  dim: 'rgba(255,241,208,0.56)',
  faint: 'rgba(255,241,208,0.34)',
  gold: '#E8C97A',
};

var ns = StyleSheet.create({
  // Chapter shell
  shell: {
    borderRadius: 20, overflow: 'hidden', borderWidth: 1,
    borderColor: 'rgba(232,201,122,0.10)', padding: WIDE ? 22 : 18, marginBottom: 14,
  },
  shellHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  shellIndex: {
    fontSize: 22, fontWeight: '900', color: 'rgba(232,201,122,0.55)',
    letterSpacing: 0.5, lineHeight: 26, marginTop: 1, fontVariant: ['tabular-nums'],
  },
  shellTitle: { fontSize: 16.5, fontWeight: '800', color: INK.title, letterSpacing: 0.2, lineHeight: 22 },
  shellSub: { fontSize: 12, color: INK.dim, marginTop: 3, lineHeight: 17 },
  shellRight: { marginLeft: 8 },

  // Verdict hero
  hero: {
    borderRadius: 24, padding: 22, paddingTop: 26, marginBottom: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(232,201,122,0.18)', alignItems: 'center',
    ...boxShadow('rgba(0,0,0,0.55)', { width: 0, height: 12 }, 0.7, 24), elevation: 8,
  },
  heroEdge: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  heroKicker: {
    fontSize: 10.5, fontWeight: '900', letterSpacing: 2.2, textTransform: 'uppercase',
    color: 'rgba(232,201,122,0.70)', marginBottom: 18, textAlign: 'center',
  },
  medalRow: { flexDirection: 'row', alignItems: 'flex-start', alignSelf: 'stretch', justifyContent: 'center', marginBottom: 18 },
  medal: { alignItems: 'center', width: 96 },
  medalRing: {
    width: 74, height: 74, borderRadius: 37, borderWidth: 2, alignItems: 'center',
    justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.30)', overflow: 'hidden', marginBottom: 8,
  },
  medalImg: { width: 50, height: 50 },
  medalName: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  medalSign: { fontSize: 10.5, fontWeight: '600', color: INK.faint, marginTop: 2, textAlign: 'center' },
  thread: { flex: 1, maxWidth: 72, flexDirection: 'row', alignItems: 'center', marginTop: 36 },
  threadLine: { flex: 1, height: 1.5, borderRadius: 1 },
  threadHeart: {
    width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(232,201,122,0.35)', backgroundColor: 'rgba(12,6,18,0.85)', marginHorizontal: 2,
  },
  arcName: { fontSize: 26, fontWeight: '900', color: INK.title, textAlign: 'center', letterSpacing: 0.2, lineHeight: 33 },
  styleRow: { alignItems: 'center', marginTop: 12 },
  styleCaption: { fontSize: 10.5, fontWeight: '900', letterSpacing: 1.6, textTransform: 'uppercase', color: 'rgba(255,241,208,0.62)', marginBottom: 3 },
  styleName: { fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
  essence: { fontSize: 14.5, lineHeight: 22, color: 'rgba(255,255,255,0.72)', textAlign: 'center', marginTop: 10, paddingHorizontal: 6 },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
  countChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(232,201,122,0.30)', backgroundColor: 'rgba(232,201,122,0.08)',
  },
  countText: { fontSize: 12, fontWeight: '700', color: 'rgba(232,201,122,0.90)' },

  // At a glance
  glanceRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 14 },
  glanceIcon: {
    width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginTop: 1,
  },
  glanceLabel: { fontSize: 10.5, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 3 },
  glanceText: { fontSize: 13.5, lineHeight: 20, color: INK.body },

  // Strengths & care
  scHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10, marginTop: 4 },
  scHeadText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.3, textTransform: 'uppercase' },
  scRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 11 },
  scRowArea: { fontSize: 13.5, fontWeight: '800', color: '#F0E0B0' },
  scRowText: { fontSize: 13, lineHeight: 19.5, color: 'rgba(255,255,255,0.64)', marginTop: 1.5 },
  scSerious: {
    backgroundColor: 'rgba(245,158,11,0.07)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.22)',
    borderRadius: 12, padding: 12, marginBottom: 11,
  },
  scSeriousTag: { fontSize: 10.5, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase', color: '#F59E0B', marginBottom: 3 },
  scPath: { fontSize: 12.5, lineHeight: 18, color: 'rgba(232,201,122,0.78)', marginTop: 6, fontStyle: 'italic' },

  // Seven signals
  radarWrap: { alignItems: 'center', marginBottom: 8, marginTop: 2 },
  sigItem: { paddingVertical: 13, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  sigTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sigName: { fontSize: 14, fontWeight: '800', color: '#FFE8B0' },
  sigTech: { fontSize: 11, color: INK.faint, marginTop: 1.5 },
  sigWhat: { fontSize: 12, lineHeight: 17.5, color: 'rgba(255,241,208,0.68)', marginTop: 8 },
  sigChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  sigChipText: { fontSize: 10.5, fontWeight: '800' },
  sigScore: { fontSize: 11, fontWeight: '800', color: INK.faint, marginLeft: 8, fontVariant: ['tabular-nums'] },
  sigTrack: {
    height: 5, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 5, overflow: 'hidden',
    marginTop: 9, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)',
  },
  sigFill: { height: '100%', borderRadius: 5, overflow: 'hidden' },
  sigInsight: { fontSize: 12.5, lineHeight: 19, color: 'rgba(255,232,176,0.72)', marginTop: 8 },
  noteText: { fontSize: 11.5, lineHeight: 17, color: INK.faint, marginTop: 14, textAlign: 'center', fontStyle: 'italic' },

  // Trust strip + form microcopy
  trustStrip: { marginBottom: 16, paddingVertical: 14 },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 6 },
  trustIcon: {
    width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(232,201,122,0.08)', borderWidth: 1, borderColor: 'rgba(232,201,122,0.18)',
  },
  trustText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: INK.body, fontWeight: '600' },
  privacyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16, paddingHorizontal: 12 },
  privacyText: { fontSize: 11, color: INK.faint, textAlign: 'center', lineHeight: 16 },
  ctaNote: { fontSize: 11.5, color: INK.dim, textAlign: 'center', marginTop: 10, marginBottom: 6 },

  // Saved-history rows
  histRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.045)' },
  histRing: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  histNames: { fontSize: 13.5, fontWeight: '800', color: '#FFE8B0' },
  histVerdict: { fontSize: 11.5, fontWeight: '800', marginTop: 2.5 },
  histMeta: { fontSize: 10.5, color: 'rgba(255,241,208,0.55)', marginTop: 3 },
  histDelete: { padding: 6 },
});

// Chapter shell — numbered like a report, quiet header, optional right accessory
function SectionShell({ index, title, sub, right, children, delay }) {
  return (
    <Animated.View entering={FadeInUp.delay(delay || 0).duration(500)}>
      <View style={ns.shell}>
        <LinearGradient
          colors={['rgba(20,12,28,0.55)', 'rgba(10,6,16,0.50)']}
          style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />
        <View style={ns.shellHead}>
          {index ? <Text style={ns.shellIndex}>{index}</Text> : null}
          <View style={{ flex: 1 }}>
            <Text style={ns.shellTitle}>{title}</Text>
            {sub ? <Text style={ns.shellSub}>{sub}</Text> : null}
          </View>
          {right ? <View style={ns.shellRight}>{right}</View> : null}
        </View>
        {children}
      </View>
    </Animated.View>
  );
}

// Small tier/score chip used in chapter headers
function ScoreChip({ text, color }) {
  var c = color || INK.gold;
  return (
    <View style={[ns.sigChip, { backgroundColor: c + '12', borderColor: c + '30' }]}>
      <Text style={[ns.sigChipText, { color: c }]}>{text}</Text>
    </View>
  );
}

// The one-line verdict everyone understands — always a full plain phrase,
// never an archetype name or a bare rating word.
function getVerdictPhrase(data, si) {
  var pct = data.percentage != null ? data.percentage
    : (data.maxPossibleScore > 0 && data.totalScore != null ? Math.round((data.totalScore / data.maxPossibleScore) * 100) : null);
  if (pct == null) {
    return { text: si ? (data.ratingSinhala || data.rating || 'ගැළපීමේ ප්‍රතිඵලය') : (data.rating || 'Your match result'), color: '#E8C97A' };
  }
  if (pct >= 75) return { text: si ? 'ඉතා හොඳ ගැළපීමක්' : 'A Very Good Match', color: '#34D399' };
  if (pct >= 55) return { text: si ? 'හොඳ ගැළපීමක්' : 'A Good Match', color: '#FBBF24' };
  if (pct >= 40) return { text: si ? 'සමබර ගැළපීමක්' : 'A Balanced Match', color: '#A78BFA' };
  return { text: si ? 'උත්සාහයෙන් වැඩෙන ගැළපීමක්' : 'A Match That Grows with Effort', color: '#F472B6' };
}

// ── VERDICT HERO ─────────────────────────────────────────────────
// Two medallions joined by a gold thread under a verdict-coloured
// aurora; the plain verdict phrase is the headline, the archetype is
// a small labelled "bond style" line, and the classical X/20 stands
// by as a quiet gold credential.
function VerdictHero({ data, reading, brideName, groomName, language, T, onShare }) {
  var si = language === 'si';
  var arc = reading && reading.archetype;
  var verdict = getVerdictPhrase(data, si);
  var bandColor = verdict.color;
  var brideRashiId = (data.brideChart && data.brideChart.lagnaRashiId) || (data.bride && data.bride.rashi && data.bride.rashi.id);
  var groomRashiId = (data.groomChart && data.groomChart.lagnaRashiId) || (data.groom && data.groom.rashi && data.groom.rashi.id);
  var count = reading && reading.traditionalCount && reading.traditionalCount.score != null
    ? reading.traditionalCount
    : { score: data.totalScore, max: data.maxPossibleScore || 20 };
  var brideSignEn = RASHI_NAMES[brideRashiId] || '';
  var groomSignEn = RASHI_NAMES[groomRashiId] || '';
  var brideSign = si ? (RASHI_SI[brideSignEn] || brideSignEn) : brideSignEn;
  var groomSign = si ? (RASHI_SI[groomSignEn] || groomSignEn) : groomSignEn;
  var headline = verdict.text;
  var essence = arc ? arc.essence : (si
    ? 'ඔබ දෙදෙනාගේ සම්පූර්ණ වාර්තාව පහතින්, පියවරෙන් පියවර සරලව විස්තර වෙනවා.'
    : 'Your full report unfolds below, step by step, in simple words.');

  return (
    <Animated.View entering={ZoomIn.springify().damping(13).delay(40)} style={ns.hero}>
      <LinearGradient
        colors={[bandColor + '26', 'rgba(232,201,122,0.05)', 'rgba(6,3,12,0.97)']}
        style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
        start={{ x: 0.2, y: 0 }} end={{ x: 0.9, y: 1 }}
      />
      <View style={[ns.heroEdge, { backgroundColor: bandColor }]} />

      <Text style={ns.heroKicker}>{si ? 'ඔබ දෙදෙනාගේ ගැළපීම — සම්පූර්ණ කියවීම' : 'YOUR MATCH, READ AS ONE'}</Text>

      <View style={ns.medalRow}>
        <View style={ns.medal}>
          <View style={[ns.medalRing, { borderColor: 'rgba(249,168,212,0.45)' }]}>
            {ZODIAC_IMAGES[brideRashiId] ? <Image source={ZODIAC_IMAGES[brideRashiId]} style={ns.medalImg} resizeMode="contain" /> : <Ionicons name="person" size={26} color="#F9A8D4" />}
          </View>
          <Text style={[ns.medalName, { color: '#F9A8D4' }]} numberOfLines={1}>{brideName || T.bride}</Text>
          {brideSign ? <Text style={ns.medalSign}>{brideSign}</Text> : null}
        </View>
        <View style={ns.thread}>
          <LinearGradient colors={['rgba(249,168,212,0.0)', INK.gold]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={ns.threadLine} />
          <View style={ns.threadHeart}>
            <Ionicons name="heart" size={13} color={bandColor} />
          </View>
          <LinearGradient colors={[INK.gold, 'rgba(147,197,253,0.0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={ns.threadLine} />
        </View>
        <View style={ns.medal}>
          <View style={[ns.medalRing, { borderColor: 'rgba(147,197,253,0.45)' }]}>
            {ZODIAC_IMAGES[groomRashiId] ? <Image source={ZODIAC_IMAGES[groomRashiId]} style={ns.medalImg} resizeMode="contain" /> : <Ionicons name="person" size={26} color="#93C5FD" />}
          </View>
          <Text style={[ns.medalName, { color: '#93C5FD' }]} numberOfLines={1}>{groomName || T.groom}</Text>
          {groomSign ? <Text style={ns.medalSign}>{groomSign}</Text> : null}
        </View>
      </View>

      <Text style={ns.arcName}>{headline}</Text>
      {arc ? (
        <View style={ns.styleRow}>
          <Text style={ns.styleCaption}>{si ? 'ඔබේ බැඳීමේ විදිය' : 'YOUR BOND STYLE'}</Text>
          <Text style={[ns.styleName, { color: bandColor }]}>{arc.name}</Text>
        </View>
      ) : null}
      <Text style={ns.essence}>{essence}</Text>

      <View style={ns.countRow}>
        {count.score != null ? (
          <View style={ns.countChip}>
            <Ionicons name="ribbon-outline" size={13} color={INK.gold} />
            <Text style={ns.countText}>{T.tradCount}: <Text style={{ fontWeight: '900', color: '#FFD97A' }}>{count.score}/{count.max}</Text></Text>
          </View>
        ) : null}
        <TouchableOpacity style={sty.shareChip} onPress={onShare} activeOpacity={0.7}>
          <Ionicons name="share-social" size={14} color="#FF8C00" />
          <Text style={sty.shareChipText}>{T.shareBtn}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ── 01 · AT A GLANCE ─────────────────────────────────────────────
// Three plain-speech takeaways so the verdict lands before any detail.
function buildGlance(data, reading, language, T) {
  var rows = [];
  var factors = (data.factors || []).filter(function (f) { return f.maxScore > 0; });

  if (factors.length > 0) {
    var best = factors.reduce(function (a, b) { return (b.score / b.maxScore) > (a.score / a.maxScore) ? b : a; });
    if (best.score / best.maxScore >= 0.6) {
      var bc = getSignalCopy(best.name, language, best.score, best.maxScore);
      rows.push({ icon: 'leaf-outline', color: '#34D399', label: T.glanceStrong, text: bc.plainName + ' — ' + bc.insight });
    }
  }

  var care = reading && reading.nurture && reading.nurture.length > 0 ? reading.nurture[0] : null;
  if (care) {
    rows.push({ icon: 'heart-half-outline', color: '#E8C97A', label: T.glanceCare, text: care.area + ' — ' + care.text });
  } else if (factors.length > 0) {
    var low = factors.reduce(function (a, b) { return (b.score / b.maxScore) < (a.score / a.maxScore) ? b : a; });
    if (low.score / low.maxScore < 0.5) {
      var lc = getSignalCopy(low.name, language, low.score, low.maxScore);
      rows.push({ icon: 'heart-half-outline', color: '#E8C97A', label: T.glanceCare, text: lc.plainName + ' — ' + lc.insight });
    }
  }

  var windows = data.advancedPorondam && data.advancedPorondam.advanced
    && data.advancedPorondam.advanced.weddingWindows
    && data.advancedPorondam.advanced.weddingWindows.favorableWindows;
  var realWindows = (windows || []).filter(function (w) { return w.end && w.end.length > 0; });
  if (realWindows.length > 0) {
    rows.push({
      icon: 'calendar-outline', color: '#A78BFA', label: T.glanceTiming,
      text: language === 'si'
        ? 'ඉදිරි වසර 3 තුළ දෙදෙනාටම හිතකර විවාහ කාල ' + realWindows.length + 'ක් හමු වුණා — විස්තර පහතින්.'
        : realWindows.length + ' favourable wedding ' + (realWindows.length === 1 ? 'window' : 'windows') + ' found for you both in the next 3 years — details below.',
    });
  } else {
    var harmony = data.advancedPorondam && data.advancedPorondam.advanced
      && data.advancedPorondam.advanced.dashaCompatibility
      && data.advancedPorondam.advanced.dashaCompatibility.harmony;
    if (harmony === 'harmonious') {
      rows.push({ icon: 'calendar-outline', color: '#A78BFA', label: T.glanceTiming, text: language === 'si' ? 'දෙදෙනාම දැන් ගෙවන්නේ එකිනෙකාට සහාය දෙන ජීවිත කාලයක් — හවුල් තීරණවලට හොඳ මොහොතක්.' : 'You are both moving through supportive life periods right now — a good moment for shared decisions.' });
    } else if (harmony === 'conflicting') {
      rows.push({ icon: 'calendar-outline', color: '#A78BFA', label: T.glanceTiming, text: language === 'si' ? 'දෙදෙනාගේ වත්මන් ජීවිත කාල වෙනස් රිද්මවල — ලොකු තීරණ ඉවසීමෙන්, කතා කරමින් ගන්න.' : 'Your current life periods run on different rhythms — take big decisions patiently, and talk them through.' });
    }
  }

  return rows;
}

function GlanceCard({ rows, index, delay, T }) {
  if (!rows || rows.length === 0) return null;
  return (
    <SectionShell index={index} delay={delay} title={T.glanceTitle} sub={T.glanceSub}>
      {rows.map(function (r, i) {
        return (
          <View key={'g' + i} style={[ns.glanceRow, i === rows.length - 1 ? { marginBottom: 2 } : null]}>
            <View style={[ns.glanceIcon, { backgroundColor: r.color + '10', borderColor: r.color + '28' }]}>
              <Ionicons name={r.icon} size={16} color={r.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[ns.glanceLabel, { color: r.color }]}>{r.label}</Text>
              <Text style={ns.glanceText}>{r.text}</Text>
            </View>
          </View>
        );
      })}
    </SectionShell>
  );
}

// ── 02 · STRENGTHS & CARE ────────────────────────────────────────
// The coupleReading's gifts / nurture / forward paths. Falls back to
// factor-derived content for readings saved before the archetype era.
function buildStrengthsCare(data, reading, language) {
  var si = language === 'si';
  var gifts = (reading && reading.gifts ? reading.gifts.slice() : []);
  var nurture = (reading && reading.nurture ? reading.nurture.slice() : []);
  var paths = (reading && reading.forwardPaths ? reading.forwardPaths.slice() : []);

  if (gifts.length === 0 && nurture.length === 0) {
    // Legacy fallback — derive from the classical factors + doshas.
    (data.factors || []).forEach(function (f) {
      if (!f.maxScore) return;
      var ratio = f.score / f.maxScore;
      var copy = getSignalCopy(f.name, language, f.score, f.maxScore);
      if (ratio >= 0.75) {
        gifts.push({ area: copy.plainName, text: copy.insight });
      } else if (ratio < 0.5) {
        var serious = (f.name === 'Nadi' || f.name === 'Rajju' || f.name === 'Vedha') && ratio < 0.25;
        nurture.push({ area: copy.plainName, text: copy.insight, severity: serious ? 'significant' : 'gentle' });
      }
    });
    (data.doshas || []).forEach(function (d) {
      var cc = getRelationshipChallengeCopy(d, language);
      var sev = String(d.severity || '').toLowerCase().indexOf('severe') !== -1 && !d.cancelled ? 'significant' : 'gentle';
      nurture.push({ area: cc.label, text: cc.desc, severity: d.cancelled ? 'gentle' : sev });
    });
    nurture.sort(function (a, b) { return (a.severity === 'significant' ? -1 : 0) - (b.severity === 'significant' ? -1 : 0); });
    if (gifts.length > 0 || nurture.length > 0) {
      paths = [
        { kind: 'timing', text: si ? 'සුබ මුහුර්තයකින් විවාහය අරඹන්න — හොඳ ආරම්භයක් හැම ගැළපීමකටම උදව්වක්.' : 'Pick an auspicious wedding time — a good start helps every match.' },
        { kind: 'understanding', text: si ? 'බලාගත යුතු තැන් ගැන කලින්ම එකට කතා කරගන්න — දැනුවත්කම ගැටුම සමීපකමට හරවනවා.' : 'Talk about the tender areas together, early — awareness turns friction into closeness.' },
      ];
    }
  }

  if (gifts.length === 0 && nurture.length === 0) return null;
  return { gifts: gifts, nurture: nurture, paths: paths };
}

function StrengthsCareCard({ content, index, delay, T }) {
  var gifts = content.gifts;
  var nurture = content.nurture;
  var paths = content.paths;

  return (
    <SectionShell index={index} delay={delay} title={T.scTitle} sub={T.scSub}>
      {gifts.length > 0 ? (
        <View>
          <View style={ns.scHead}>
            <Ionicons name="sunny-outline" size={13} color="#34D399" />
            <Text style={[ns.scHeadText, { color: '#34D399' }]}>{T.scGifts}</Text>
          </View>
          {gifts.map(function (g, i) {
            return (
              <View key={'gi' + i} style={ns.scRow}>
                <Ionicons name="checkmark-circle" size={16} color="#34D399" style={{ marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text style={ns.scRowArea}>{g.area}</Text>
                  <Text style={ns.scRowText}>{g.text}</Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {nurture.length > 0 ? (
        <View style={gifts.length > 0 ? { marginTop: 10 } : null}>
          <View style={ns.scHead}>
            <Ionicons name="rose-outline" size={13} color="#E8C97A" />
            <Text style={[ns.scHeadText, { color: '#E8C97A' }]}>{T.scCare}</Text>
          </View>
          {nurture.map(function (n, i) {
            var serious = n.severity === 'significant';
            var inner = (
              <View style={ns.scRow}>
                <Ionicons name={serious ? 'alert-circle' : 'leaf-outline'} size={16} color={serious ? '#F59E0B' : 'rgba(232,201,122,0.7)'} style={{ marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  {serious ? <Text style={ns.scSeriousTag}>{T.scSignificant}</Text> : null}
                  <Text style={ns.scRowArea}>{n.area}</Text>
                  <Text style={ns.scRowText}>{n.text}</Text>
                  {n.path ? <Text style={ns.scPath}>{n.path}</Text> : null}
                </View>
              </View>
            );
            return serious
              ? <View key={'nu' + i} style={ns.scSerious}>{inner}</View>
              : <View key={'nu' + i}>{inner}</View>;
          })}
        </View>
      ) : null}

      {paths.length > 0 ? (
        <View style={{ marginTop: 10 }}>
          <View style={ns.scHead}>
            <Ionicons name="trail-sign-outline" size={13} color="#FBBF24" />
            <Text style={[ns.scHeadText, { color: '#FBBF24' }]}>{T.scPaths}</Text>
          </View>
          {paths.map(function (p, i) {
            var icon = p.kind === 'timing' ? 'calendar-outline' : p.kind === 'astrologer' ? 'person-outline' : 'sparkles-outline';
            return (
              <View key={'pa' + i} style={ns.scRow}>
                <Ionicons name={icon} size={15} color="#FBBF24" style={{ marginTop: 2 }} />
                <Text style={[ns.scRowText, { flex: 1, marginTop: 0 }]}>{p.text}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </SectionShell>
  );
}

// ── 03 · THE SEVEN CLASSICAL SIGNALS ─────────────────────────────
function FactorBar({ f, order, language }) {
  var copy = getSignalCopy(f.name, language, f.score, f.maxScore);
  var pct = f.maxScore > 0 ? f.score / f.maxScore : 0;
  var c = copy.color;
  return (
    <Animated.View entering={FadeInUp.delay(60 * order).duration(450)} style={ns.sigItem}>
      <View style={ns.sigTop}>
        <View style={{ flex: 1 }}>
          <Text style={ns.sigName}>{copy.plainName}</Text>
          <Text style={ns.sigTech}>{copy.techName}</Text>
        </View>
        <View style={[ns.sigChip, { backgroundColor: c + '12', borderColor: c + '30' }]}>
          <Text style={[ns.sigChipText, { color: c }]}>{copy.tierLabel}</Text>
        </View>
        <Text style={ns.sigScore}>{f.score}/{f.maxScore}</Text>
      </View>
      {copy.what ? <Text style={ns.sigWhat}>{copy.what}</Text> : null}
      <View style={ns.sigTrack}>
        <Animated.View entering={FadeIn.delay(150 + 60 * order).duration(700)} style={[ns.sigFill, { width: Math.max(pct * 100, 3) + '%' }]}>
          <LinearGradient colors={[c + 'AA', c]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
      </View>
      {copy.insight ? <Text style={ns.sigInsight}>{copy.insight}</Text> : null}
    </Animated.View>
  );
}

function SignalsCard({ data, index, delay, language, T }) {
  var factors = data.factors || [];
  if (factors.length === 0) return null;
  var score = data.totalScore;
  var max = data.maxPossibleScore || 20;
  return (
    <SectionShell
      index={index} delay={delay} title={T.factors} sub={T.factorsSub}
      right={score != null ? <ScoreChip text={score + '/' + max} /> : null}
    >
      {factors.length >= 3 ? (
        <View style={ns.radarWrap}>
          <RadarChart
            factors={factors}
            size={Math.min(W - 72, 340)}
            color1="#A78BFA"
            color2="#FFB800"
            animated={true}
            labels={factors.map(function (f) { return getSignalCopy(f.name, language, f.score, f.maxScore).shortName; })}
          />
        </View>
      ) : null}
      {factors.map(function (f, i) { return <FactorBar key={f.name + i} f={f} order={i} language={language} />; })}
      <Text style={ns.noteText}>{T.signalsNote}</Text>
    </SectionShell>
  );
}

// ── Trust strip shown on the input page ──────────────────────────
function TrustStrip({ T }) {
  var items = [
    { icon: 'planet-outline', text: T.trust1 },
    { icon: 'analytics-outline', text: T.trust2 },
    { icon: 'document-text-outline', text: T.trust3 },
  ];
  return (
    <Animated.View entering={FadeInDown.delay(140).duration(600)}>
      <Glass style={ns.trustStrip}>
        {items.map(function (it, i) {
          return (
            <View key={'tr' + i} style={ns.trustRow}>
              <View style={ns.trustIcon}>
                <Ionicons name={it.icon} size={15} color={INK.gold} />
              </View>
              <Text style={ns.trustText}>{it.text}</Text>
            </View>
          );
        })}
      </Glass>
    </Animated.View>
  );
}

// ── LAGNA MATCH MAP — tap any sign (your own included) for a simple reading ──
var LX_BAND_ORDER = ['harmony', 'magnetic', 'balanced', 'growth'];

function LagnaExplorerCard({ myLagnaId, language, userName }) {
  var si = language === 'si';
  var lang = si ? 'si' : 'en';
  var [selected, setSelected] = useState(myLagnaId);
  var signNames = si ? RASHI_NAMES_SI : RASHI_NAMES;
  var arcs = {};
  for (var i = 1; i <= 12; i++) arcs[i] = deriveLagnaArchetype(myLagnaId, i, language);
  var sel = arcs[selected] || arcs[myLagnaId];
  var selColor = sel.bandColor;

  return (
    <Animated.View entering={FadeInDown.delay(200).duration(600).springify().damping(14)} style={lx.card}>
      <LinearGradient
        colors={['rgba(26,15,36,0.62)', 'rgba(9,5,15,0.58)']}
        style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />
      <View style={lx.goldEdge} />

      {/* Header — who you are, what this map does */}
      <View style={lx.headRow}>
        <View style={lx.headMedal}>
          <Image source={ZODIAC_IMAGES[myLagnaId]} resizeMode="contain" style={lx.headImg} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={lx.kicker}>{si ? 'ලග්න ගැළපීම් සිතියම' : 'LAGNA MATCH MAP'}</Text>
          <Text style={lx.title}>
            {si
              ? (userName ? userName + ', ඔබේ ලග්නය ' + signNames[myLagnaId] : 'ඔබේ ලග්නය ' + signNames[myLagnaId])
              : (userName ? userName + ', your lagna is ' + signNames[myLagnaId] : 'Your lagna is ' + signNames[myLagnaId])}
          </Text>
          <Text style={lx.sub}>
            {si
              ? 'ලග්නයක් ඔබන්න — ඒ ලග්නය සමඟ ඔබේ බැඳීම මොන වගේද කියා සරලව බලන්න.'
              : 'Tap a sign to see, in simple words, what your bond with it is like.'}
          </Text>
        </View>
      </View>

      {/* The four bond styles */}
      <View style={lx.legendRow}>
        {LX_BAND_ORDER.map(function (k) {
          return (
            <View key={k} style={lx.legendChip}>
              <View style={[lx.legendDot, { backgroundColor: ARCHETYPE_BANDS[k].color }]} />
              <Text style={lx.legendText}>{ARCHETYPE_BANDS[k][lang]}</Text>
            </View>
          );
        })}
      </View>

      {/* 12-sign grid — 4 per row (3 rows), your own sign included */}
      <View style={lx.grid}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(function (id) {
          var arc = arcs[id];
          var active = id === selected;
          return (
            <TouchableOpacity
              key={id}
              style={lx.cellWrap}
              activeOpacity={0.75}
              onPress={function () {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setSelected(id);
              }}
            >
              <View style={[lx.cell, {
                borderColor: active ? arc.bandColor : arc.bandColor + '3A',
                backgroundColor: active ? arc.bandColor + '18' : 'rgba(255,255,255,0.025)',
              }]}>
                {arc.isSame ? (
                  <View style={[lx.sameBadge, { backgroundColor: arc.bandColor }]}>
                    <Text style={lx.sameBadgeText}>{si ? 'ඔබ' : 'YOU'}</Text>
                  </View>
                ) : null}
                <Image source={ZODIAC_IMAGES[id]} resizeMode="contain" style={lx.cellImg} />
                <Text style={[lx.cellName, active ? { color: '#FFF1D0' } : null]} numberOfLines={1}>{signNames[id]}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* What the selected pairing is like */}
      <View style={[lx.detail, { borderColor: selColor + '45' }]}>
        <LinearGradient
          colors={[selColor + '14', 'rgba(10,6,16,0.0)']}
          style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
          start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        />
        <View style={lx.detailTop}>
          <View style={[lx.detailBandChip, { borderColor: selColor + '55', backgroundColor: selColor + '14' }]}>
            <Text style={[lx.detailBandText, { color: selColor }]}>{sel.bandLabel}</Text>
          </View>
          <Ionicons name={sel.emblem} size={15} color={selColor} />
        </View>
        <Text style={lx.detailName}>{sel.name}</Text>
        <Text style={lx.detailPair}>
          {signNames[myLagnaId] + '  +  ' + signNames[selected] + (sel.isSame ? (si ? '  ·  ඔබේම ලග්නය' : '  ·  same as yours') : '')}
        </Text>
        <Text style={lx.detailEssence}>{sel.essence}</Text>
        {sel.detail ? <Text style={lx.detailBody}>{sel.detail}</Text> : null}
      </View>

      {/* Honesty note + gentle push to the full reading */}
      <Text style={lx.note}>
        {si
          ? 'කිසිම ලග්නයක් “නරක” නැහැ — වෙනස් වෙන්නේ බැඳීමේ විදිය විතරයි. සම්පූර්ණ ඇත්ත දැනගන්න පොරොන්දම් හතම බැලිය යුතුයි.'
          : 'No sign is a “bad” match — only the style of the bond changes. For the full truth, all the porondam checks are needed.'}
      </Text>
      <View style={lx.footerWrap}>
        <Ionicons name="sparkles" size={13} color="#FBBF24" />
        <Text style={lx.footer}>
          {si
            ? 'සම්පූර්ණ ගැළපීම බලන්න — පහතින් දෙදෙනාගේ විස්තර දෙන්න ✨'
            : 'For your full reading — enter both sets of details below ✨'}
        </Text>
      </View>
    </Animated.View>
  );
}

var lx = StyleSheet.create({
  card: { borderRadius: 22, overflow: 'hidden', padding: 18, marginBottom: 20, borderWidth: 1.5, borderColor: 'rgba(232,201,122,0.16)' },
  goldEdge: { position: 'absolute', top: 0, left: 0, right: 0, height: 2.5, backgroundColor: '#FBBF24', opacity: 0.65 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 14 },
  headMedal: {
    width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: 'rgba(251,191,36,0.5)',
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)',
  },
  headImg: { width: 36, height: 36 },
  kicker: { fontSize: 10, fontWeight: '900', letterSpacing: 1.8, color: 'rgba(251,191,36,0.85)', textTransform: 'uppercase' },
  title: { fontSize: 16.5, fontWeight: '800', color: '#FFF1D0', marginTop: 3, lineHeight: 22 },
  sub: { fontSize: 12, color: 'rgba(255,241,208,0.68)', marginTop: 3, lineHeight: 17 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  legendChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.035)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 10, fontWeight: '700', color: 'rgba(255,241,208,0.6)' },
  // 4 columns at any width: percentage cells + negative-margin gutters, so no
  // fixed pixel maths can round a row down to three.
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: 12 },
  cellWrap: { width: '25%', padding: 4 },
  cell: { paddingVertical: 9, paddingHorizontal: 2, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', gap: 5 },
  cellImg: { width: 28, height: 28 },
  cellName: { fontSize: 10.5, fontWeight: '700', color: 'rgba(255,241,208,0.6)', maxWidth: '96%' },
  sameBadge: { position: 'absolute', top: 3, right: 3, paddingHorizontal: 4, paddingVertical: 1.5, borderRadius: 5, zIndex: 2 },
  sameBadgeText: { fontSize: 9, fontWeight: '900', color: '#1A0F24', letterSpacing: 0.3 },
  detail: { borderRadius: 16, borderWidth: 1, padding: 14, overflow: 'hidden', marginBottom: 12 },
  detailTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  detailBandChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  detailBandText: { fontSize: 10, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  detailName: { fontSize: 18, fontWeight: '900', color: '#F8E7B8' },
  detailPair: { fontSize: 11.5, fontWeight: '700', color: 'rgba(232,201,122,0.6)', marginTop: 3 },
  detailEssence: { fontSize: 13, lineHeight: 19.5, color: 'rgba(255,255,255,0.78)', marginTop: 9 },
  detailBody: { fontSize: 12.5, lineHeight: 19, color: 'rgba(255,241,208,0.60)', marginTop: 8 },
  note: { fontSize: 11.5, lineHeight: 17, color: 'rgba(255,241,208,0.62)', textAlign: 'center', fontStyle: 'italic', paddingHorizontal: 6 },
  footerWrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10,
    paddingTop: 11, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  footer: { fontSize: 11.5, color: 'rgba(255,255,255,0.62)', textAlign: 'center', lineHeight: 15 },
});

// Labels — simple, everyday language; Sinhala in the warm ඔබ register
var L = {
  en: {
    title: 'Marriage Match', subtitle: 'All the porondam checks — explained in simple words',
    bride: 'Bride', groom: 'Groom',
    namePh: 'Name',
    yearPh: 'YYYY', monthPh: 'MM', dayPh: 'DD', hourPh: 'HH', minutePh: 'MM',
    date: 'Date of Birth', time: 'Time of Birth',
    birthPlace: 'Place of Birth',
    timeHint: 'The exact birth time makes the reading more accurate — you can find it on the birth certificate.',
    checkBtn: 'Check Our Match',
    ctaNote: 'Takes about a minute · saved to your account',
    trust1: 'We build both birth charts from the exact details you give',
    trust2: 'All seven porondam checks, each one explained simply',
    trust3: 'You also get a full written report as a PDF to keep',
    privacyNote: 'Your birth details are used only to build these two charts — nothing else.',
    langTitle: 'Language of the written report',
    brideChart: 'Bride’s Birth Chart', groomChart: 'Groom’s Birth Chart',
    factors: 'The seven porondam checks', factorsSub: 'The traditional 20 points — what each check means, in plain words',
    signalsNote: 'Scored the traditional way — 20 points across the classical porondam checks, read from both charts.',
    report: 'The Written Report',
    reportQ: 'Written report in:',
    si: 'සිංහල', en: 'English',
    generating: 'Your report is being written from both charts…', shareBtn: 'Share',
    reportBusy: 'The report service is busy right now. Your report is reserved — try again in a few minutes. No extra payment.',
    reportFailed: 'The report could not be written just now. Please try again — your access is saved.',
    retryReport: 'Write the report again — free',
    aiDownTitle: 'Report service is busy',
    aiDownBusy: 'The report-writing service is busy right now, so you have NOT been charged anything. Please try again in about {min} minute(s).',
    aiDownBudget: 'Today’s report limit has been reached, so you have NOT been charged anything. Please try again tomorrow.',
    aiDownNetwork: 'We couldn’t reach the service, so you have NOT been charged anything. Check your connection and try again.',
    overall: 'of the traditional 20',
    missing: 'Please fill in the birth details for both of you',
    edit: 'Change Details', calculating: 'Reading both charts…',
    backToForm: 'Back', resultHeader: 'Compatibility Report',
    history: 'Past Checks', historyEmpty: 'No saved checks yet',
    historyChip: 'Saved', historyClose: 'Close',
    historySub: 'Tap a check to open it again',
    historyLoading: 'Opening your check…', viewReport: 'Open Report',
    newCheck: '+ New Check',
    deleteTitle: 'Delete this check?', deleteMsg: 'Once deleted, it can’t be brought back.',
    deleteCancel: 'Keep it', deleteConfirm: 'Delete',
    tradCount: 'Traditional porondams',
    glanceTitle: 'At a glance', glanceSub: 'The three things to know first',
    glanceStrong: 'What matches best', glanceCare: 'What needs the most care', glanceTiming: 'About timing',
    scTitle: 'What’s good & what needs care', scSub: 'Both sides honestly — nothing hidden, nothing scary',
    scGifts: 'What’s already good', scCare: 'What to look after', scPaths: 'What you can do next',
    scSignificant: 'An important point — please consider it',
    attractionTitle: 'Attraction & closeness', attractionSub: 'How strong the pull between you is, and what kind it is',
    naturesTitle: 'Your two natures',
    lifeNowTitle: 'Life right now', lifeNowSub: 'What kind of period each of you is going through',
    deepTitle: 'The deeper bond', deepSub: 'Checks that look at married life itself, beyond the surface',
    weddingTitle: 'Good wedding dates', weddingSub: 'Time periods that are good in both charts at once',
    noWindows: 'No shared favourable period was found',
    starsTitle: 'Your birth stars', starsSub: 'The key details an astrologer would ask for — sign, star, ruler',
    curioTitle: 'For the curious', curioSub: 'Symbolic readings — fun to explore, not for decisions',
    readerChapters: 'chapters', readerMin: 'min read',
    readerSub: 'Written from both charts — read it together, slowly.',
    methodTitle: 'How this report is made',
    methodBody: 'First we build both birth charts from the date, time and place you gave. Then we read the seven porondam checks, the navamsha match (the chart for married life), the life periods you are each in now, and the Mars check — the same order a traditional matcher follows, calculated precisely.',
    guidanceNote: 'This report is here to help you think — it is not a final verdict on your future. The decision, and the relationship, always belong to you two.',
  },
  si: {
    title: 'පොරොන්දම් ගැළපීම', subtitle: 'පොරොන්දම් සියල්ල බලා, සරල බසින් කියන සම්පූර්ණ වාර්තාව',
    bride: 'මනාලිය', groom: 'මනාලයා',
    namePh: 'නම',
    yearPh: 'YYYY', monthPh: 'MM', dayPh: 'DD', hourPh: 'HH', minutePh: 'MM',
    date: 'උපන් දිනය', time: 'උපන් වේලාව',
    birthPlace: 'උපන් ස්ථානය',
    timeHint: 'උපන් වේලාව හරියටම දුන්නොත් වාර්තාව වඩාත් නිවැරදියි — එය උප්පැන්න සහතිකයේ සඳහන් වෙනවා.',
    checkBtn: 'ගැළපීම බලන්න',
    ctaNote: 'මිනිත්තුවක් පමණ යනවා · වාර්තාව ඔබේ ගිණුමට සුරැකෙනවා',
    trust1: 'ඔබ දෙන විස්තරවලින්ම දෙදෙනාගේ කේන්දර දෙක හදනවා',
    trust2: 'පොරොන්දම් හතම බලා, එකින් එක සරලව පැහැදිලි කරනවා',
    trust3: 'තබාගත හැකි සම්පූර්ණ ලිඛිත වාර්තාවක් PDF ලෙසත් ලැබෙනවා',
    privacyNote: 'උපන් විස්තර පාවිච්චි වන්නේ මේ කේන්දර දෙක හදන්න පමණයි — වෙන කිසි දෙයකට නැහැ.',
    langTitle: 'ලිඛිත වාර්තාවේ භාෂාව',
    brideChart: 'මනාලියගේ කේන්දරය', groomChart: 'මනාලයාගේ කේන්දරය',
    factors: 'පොරොන්දම් හත', factorsSub: 'එක් එක් පොරොන්දම, තේරෙන බසින් — සම්ප්‍රදායික ලකුණු 20',
    signalsNote: 'ලකුණු ගණන් කරන්නේ පැරණි සම්ප්‍රදායික ක්‍රමයටමයි — කේන්දර දෙකෙන් කියවෙන පොරොන්දම් ලකුණු 20ක් ලෙස.',
    report: 'ලිඛිත වාර්තාව',
    reportQ: 'ලිඛිත වාර්තාව ලියැවෙන භාෂාව:',
    si: 'සිංහල', en: 'English',
    generating: 'ඔබේ කේන්දර දෙක බලා වාර්තාව ලියැවෙමින් යනවා…', shareBtn: 'බෙදාගන්න',
    reportBusy: 'වාර්තා ලියන සේවාව මේ වෙලාවේ කාර්යබහුලයි. ඔබේ වාර්තාව වෙන් කර තිබෙනවා — මිනිත්තු කීපයකින් නැවත උත්සාහ කරන්න. අමතර ගෙවීමක් නැහැ.',
    reportFailed: 'මේ වෙලාවේ වාර්තාව ලියැවුණේ නැහැ. නැවත උත්සාහ කරන්න — ඔබේ අවස්ථාව සුරැකී තිබෙනවා.',
    retryReport: 'වාර්තාව නැවත ලියන්න — නොමිලේ',
    aiDownTitle: 'වාර්තා සේවාව කාර්යබහුලයි',
    aiDownBusy: 'වාර්තා ලියන සේවාව මේ වෙලාවේ කාර්යබහුලයි — ඒ නිසා ඔබෙන් කිසිම ගෙවීමක් අරගෙන නැහැ. මිනිත්තු {min}කින් පමණ නැවත උත්සාහ කරන්න.',
    aiDownBudget: 'අද දවසේ වාර්තා සීමාව සම්පූර්ණයි — ඒ නිසා ඔබෙන් ගෙවීමක් අරගෙන නැහැ. හෙට නැවත උත්සාහ කරන්න.',
    aiDownNetwork: 'සේවාවට සම්බන්ධ වෙන්න බැරි වුණා — ඒ නිසා ඔබෙන් ගෙවීමක් අරගෙන නැහැ. සම්බන්ධතාවය බලා නැවත උත්සාහ කරන්න.',
    overall: 'සම්ප්‍රදායික ලකුණු 20න්',
    missing: 'දෙදෙනාගේම උපන් විස්තර සම්පූර්ණ කරන්න',
    edit: 'විස්තර වෙනස් කරන්න', calculating: 'කේන්දර දෙක කියවමින්…',
    backToForm: 'ආපසු', resultHeader: 'ගැළපීම් වාර්තාව',
    history: 'කලින් බැලූ ගැළපීම්', historyEmpty: 'තවම සුරැකූ ගැළපීම් නැහැ',
    historyChip: 'සුරැකූ ඒවා', historyClose: 'වහන්න',
    historySub: 'නැවත බලන්න ඕනෑ ගැළපීමක් ඔබන්න',
    historyLoading: 'ඔබේ ගැළපීම විවෘත වෙමින්…', viewReport: 'වාර්තාව බලන්න',
    newCheck: '+ අලුත් ගැළපීමක්',
    deleteTitle: 'මෙම ගැළපීම මකන්නද?', deleteMsg: 'මැකූ පසු නැවත ලබාගන්න බැහැ.',
    deleteCancel: 'තියන්න', deleteConfirm: 'මකන්න',
    tradCount: 'සම්ප්‍රදායික පොරොන්දම්',
    glanceTitle: 'එක බැල්මෙන්', glanceSub: 'මුලින්ම දැනගත යුතු කරුණු තුන',
    glanceStrong: 'හොඳින්ම ගැළපෙන දේ', glanceCare: 'වැඩිපුරම බලාගත යුතු දේ', glanceTiming: 'කාලය ගැන',
    scTitle: 'ගැළපෙන තැන් සහ හදාගත යුතු තැන්', scSub: 'ඇත්ත ඇති සැටියෙන් — සැඟවීමකුත් නැහැ, බය කිරීමකුත් නැහැ',
    scGifts: 'දැනටමත් හොඳින් ගැළපෙන තැන්', scCare: 'සැලකිලිමත් විය යුතු තැන්', scPaths: 'ඉදිරියට යන මග',
    scSignificant: 'වැදගත් කරුණක් — සලකා බලන්න',
    attractionTitle: 'ආකර්ෂණය සහ සමීපකම', attractionSub: 'දෙදෙනා අතර ඇදීම — කොපමණද, කොහොමද',
    naturesTitle: 'දෙදෙනාගේ ස්වභාවය',
    lifeNowTitle: 'මේ දවස්වල ජීවිතය', lifeNowSub: 'දෙදෙනා දැන් ගෙවන්නේ මොන වගේ කාලයක්ද',
    deepTitle: 'ගැඹුරු බැඳීම', deepSub: 'මතුපිට ලකුණුවලට එහායින් — විවාහ ජීවිතයම ගැන බලන පරීක්ෂා',
    weddingTitle: 'විවාහයට සුබම කාල', weddingSub: 'කේන්දර දෙකටම එකවර හිතකර කාල වකවානු',
    noWindows: 'දෙකටම ගැළපෙන සුබ කාලයක් හමු වුණේ නැහැ',
    starsTitle: 'උපන් නැකැත් සහ රාශි', starsSub: 'ජ්‍යෝතිෂවේදියෙක් මුලින්ම අහන විස්තර — රාශිය, නැකැත, අධිපති ග්‍රහයා',
    curioTitle: 'රසවත් අමතර කියවීම්', curioSub: 'හිතට රසවත් සංකේත කියවීම් — තීරණවලට නම් නොවේ',
    readerChapters: 'පරිච්ඡේද', readerMin: 'මිනි. කියවීම',
    readerSub: 'කේන්දර දෙකම බලා ලියූ වාර්තාව — දෙදෙනාම එකට, හෙමින් කියවන්න.',
    methodTitle: 'මේ වාර්තාව හැදෙන විදිය',
    methodBody: 'මුලින්ම, ඔබ දුන් උපන් දිනය, වේලාව සහ ස්ථානය අනුව දෙදෙනාගේ කේන්දර දෙක හදනවා. ඉන්පසු පොරොන්දම් හත, නවාංශක ගැළපීම (විවාහ ජීවිතය ගැනම බලන කේන්දරය), දැන් ගෙවෙන දශා කාල සහ කුජ පරීක්ෂාව — පරම්පරාවෙන් ආ පිළිවෙළටම — නිවැරදිව ගණනය කරනවා.',
    guidanceNote: 'මේ වාර්තාව තිබෙන්නේ ඔබට හිතන්න උදව්වක් විදියටයි — ඔබේ අනාගතය ගැන අවසාන තීන්දුවක් නොවේ. තීරණයත්, සම්බන්ධයත් හැම විටම ඔබ දෙදෙනාගේමයි.',
  },
};
// ═══════════════════════════════════════════════════════════════
// RESULT CHAPTERS — merged, plain-spoken, tradition as the caption
// ═══════════════════════════════════════════════════════════════

var PLANET_SI = {
  Sun: 'රවි', Moon: 'චන්ද්‍ර', Mars: 'කුජ', Mercury: 'බුධ', Jupiter: 'ගුරු',
  Venus: 'සිකුරු', Saturn: 'ශනි', Rahu: 'රාහු', Ketu: 'කේතු',
};
function planetLabel(name, si) {
  if (!name) return '';
  return si ? (PLANET_SI[name] || name) : name;
}

var cd = StyleSheet.create({
  deepCaption: { fontSize: 10.5, color: 'rgba(255,241,208,0.55)', marginTop: 1.5 },
  harmonyNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  harmonyText: { flex: 1, fontSize: 12.5, lineHeight: 18.5, color: 'rgba(255,241,208,0.66)' },

  natureName: { fontSize: 15, fontWeight: '900', marginTop: 4 },

  curioBlockTitle: {
    fontSize: 11, fontWeight: '900', letterSpacing: 1.3, textTransform: 'uppercase',
    color: 'rgba(192,132,252,0.85)', marginBottom: 10, marginTop: 16,
  },

  weddingRow: { flexDirection: 'row', gap: 11, paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  weddingIcon: {
    width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  weddingDates: { fontSize: 13.5, fontWeight: '800' },
  weddingReason: { fontSize: 12, color: 'rgba(255,241,208,0.68)', marginTop: 3, lineHeight: 17.5 },
  weddingMeta: { fontSize: 10.5, color: 'rgba(255,241,208,0.55)', marginTop: 3 },
  bestChip: {
    backgroundColor: 'rgba(52,211,153,0.12)', paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 6, borderWidth: 1, borderColor: 'rgba(52,211,153,0.25)',
  },

  // Written reading
  readerCover: {
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(232,201,122,0.22)', padding: 16,
    marginBottom: 12, overflow: 'hidden', alignItems: 'center',
  },
  readerKicker: {
    fontSize: 10.5, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase',
    color: 'rgba(232,201,122,0.75)', textAlign: 'center',
  },
  readerNames: { fontSize: 16, fontWeight: '800', color: '#F6E4B8', marginTop: 8, textAlign: 'center' },
  readerMeta: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' },
  readerMetaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  readerMetaText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,241,208,0.62)' },
  readerHint: { fontSize: 11.5, color: 'rgba(255,241,208,0.62)', marginTop: 12, textAlign: 'center', fontStyle: 'italic', lineHeight: 16.5 },

  chapter: {
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.02)', marginBottom: 10, overflow: 'hidden',
  },
  chapterHead: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13 },
  chapterGlyph: {
    width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(232,201,122,0.08)', borderWidth: 1, borderColor: 'rgba(232,201,122,0.18)',
  },
  chapterGlyphText: { fontSize: 15 },
  chapterTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: '#FFE8B0', lineHeight: 19 },
  chapterBody: { paddingHorizontal: 15, paddingBottom: 15 },

  methodWrap: {
    borderRadius: 18, borderWidth: 1, borderColor: 'rgba(232,201,122,0.10)',
    padding: 18, marginTop: 6, marginBottom: 10, overflow: 'hidden',
  },
  methodHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  methodTitle: { fontSize: 12.5, fontWeight: '900', color: 'rgba(232,201,122,0.85)', letterSpacing: 0.4 },
  methodBody: { fontSize: 12.5, lineHeight: 19.5, color: 'rgba(255,241,208,0.68)' },
  guidancePanel: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 14, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: 'rgba(232,201,122,0.12)',
  },
  guidanceText: { flex: 1, fontSize: 12.5, lineHeight: 19.5, color: 'rgba(255,241,208,0.72)', fontStyle: 'italic' },

  retryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, alignSelf: 'center',
    marginTop: 14, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12, backgroundColor: '#E8C97A',
  },
  retryBtnText: { fontSize: 12.5, fontWeight: '900', color: '#1A0F24', letterSpacing: 0.3 },
});

// ── 04 · ATTRACTION & CLOSENESS ──────────────────────────────────
var MAG_LABELS = {
  'Venus-Mars Spark': { en: 'Physical spark', si: 'කායික ආකර්ෂණය', icon: 'flame', color: '#F97316' },
  '7th House Resonance': { en: 'Partnership fit', si: 'සහකරු ගැළපීම', icon: 'home', color: '#A78BFA' },
  'Nakshatra Lord Affinity': { en: 'Star-lord friendship', si: 'තරු අධිපති මිත්‍රත්වය', icon: 'star', color: '#FBBF24' },
  'Rahu-Ketu Karmic Axis': { en: 'Karmic thread', si: 'කර්ම බැඳීම', icon: 'infinite', color: '#C084FC' },
  'Moon Emotional Sync': { en: 'Emotional sync', si: 'හැඟීම් සමමුහුර්තය', icon: 'moon', color: '#22D3EE' },
};

var YONI_META = {
  Horse: { icon: 'flash', color: '#F97316', si: 'අශ්ව', trait: { en: 'Free-spirited & adventurous', si: 'නිදහස් සිතැති, වේගවත්' } },
  Elephant: { icon: 'shield', color: '#A78BFA', si: 'ගජ', trait: { en: 'Powerful & protective', si: 'බලවත්, ආරක්ෂාකාරී' } },
  Goat: { icon: 'leaf', color: '#34D399', si: 'ඡාග', trait: { en: 'Tender & affectionate', si: 'මෘදු, සෙනෙහෙබර' } },
  Serpent: { icon: 'eye', color: '#C084FC', si: 'සර්ප', trait: { en: 'Intense & magnetic', si: 'තීව්‍ර, ආකර්ෂණීය' } },
  Dog: { icon: 'heart', color: '#FB923C', si: 'ශ්වාන', trait: { en: 'Devoted & faithful', si: 'පක්ෂපාත, විශ්වාසවන්ත' } },
  Cat: { icon: 'moon', color: '#F472B6', si: 'මාර්ජාර', trait: { en: 'Graceful & independent', si: 'සියුම්, ස්වාධීන' } },
  Rat: { icon: 'sparkles', color: '#FBBF24', si: 'මූෂික', trait: { en: 'Quick & adaptable', si: 'චතුර, අනුවර්තී' } },
  Cow: { icon: 'sunny', color: '#A3E635', si: 'ගව', trait: { en: 'Warm & nurturing', si: 'උණුසුම්, පෝෂණශීලී' } },
  Buffalo: { icon: 'barbell', color: '#64748B', si: 'මහිෂ', trait: { en: 'Strong & enduring', si: 'ශක්තිමත්, ඉවසිලිවන්ත' } },
  Tiger: { icon: 'flame', color: '#EF4444', si: 'ව්‍යාඝ්‍ර', trait: { en: 'Fierce & passionate', si: 'නිර්භීත, ආවේගශීලී' } },
  Deer: { icon: 'flower', color: '#22D3EE', si: 'මෘග', trait: { en: 'Romantic & sensitive', si: 'රොමැන්තික, සංවේදී' } },
  Monkey: { icon: 'happy', color: '#FB923C', si: 'වානර', trait: { en: 'Playful & curious', si: 'ක්‍රීඩාශීලී, කුතුහලප්‍රිය' } },
  Mongoose: { icon: 'rocket', color: '#F59E0B', si: 'නකුල', trait: { en: 'Bold & fearless', si: 'නිර්භය, ක්ෂණික' } },
  Lion: { icon: 'star', color: '#F97316', si: 'සිංහ', trait: { en: 'Commanding & generous', si: 'අභිමානවත්, ත්‍යාගශීලී' } },
};

function AttractionCard({ data, index, delay, language, T, bName, gName }) {
  var si = language === 'si';
  var mag = data.magnetism;
  var yoniFactor = data.factors && data.factors.find(function (f) { return f.name === 'Yoni'; });
  var brideYoni = yoniFactor && yoniFactor.brideYoni;
  var groomYoni = yoniFactor && yoniFactor.groomYoni;
  var hasMag = mag && mag.totalScore != null && mag.maxScore;
  if (!hasMag && !brideYoni) return null;

  var magFactors = (hasMag && mag.factors) || [];
  var yoniScore = yoniFactor ? yoniFactor.score : 0;
  var yoniNarrative = yoniScore >= 3
    ? (si ? 'එකම ස්වභාවය — නොවෙහෙසී එකට ගැළපෙනවා.' : 'The same nature — effortlessly in tune.')
    : yoniScore >= 2
      ? (si ? 'මිත්‍ර ස්වභාවයන් — ස්වාභාවික ආකර්ෂණයක් තිබෙනවා.' : 'Friendly natures — you simply click.')
      : (si ? 'වෙනස් ස්වභාවයන් — හිතාමතා එකට කාලය ගත කිරීමෙන් සමීපත්වය වර්ධනය වෙනවා.' : 'Different natures — closeness grows with deliberate time together.');

  return (
    <SectionShell
      index={index} delay={delay} title={T.attractionTitle} sub={T.attractionSub}
      right={hasMag ? <ScoreChip text={mag.totalScore + '/' + mag.maxScore} color="#F472B6" /> : null}
    >
      {magFactors.length > 0 ? magFactors.map(function (fac, i) {
        var meta = MAG_LABELS[fac.nameEn] || { en: fac.nameEn || fac.nameSi || 'Signal', si: fac.nameSi || fac.nameEn || 'සංඥාව', icon: 'ellipse', color: '#FFB800' };
        var pct = fac.maxScore > 0 ? fac.score / fac.maxScore : 0;
        var barColor = pct >= 0.7 ? '#34D399' : pct >= 0.4 ? '#E8C97A' : '#F59E0B';
        return (
          <View key={'mg' + i} style={sty.magRow}>
            <View style={[sty.magIcon, { backgroundColor: meta.color + '14', borderColor: meta.color + '30' }]}>
              <Ionicons name={meta.icon} size={15} color={meta.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={sty.magLabel}>{si ? meta.si : meta.en}</Text>
              <View style={sty.magBarBg}>
                <View style={[sty.magBarFill, { width: Math.max(pct * 100, 4) + '%', backgroundColor: barColor }]} />
              </View>
            </View>
            <Text style={[sty.magScore, { color: barColor }]}>{fac.score}/{fac.maxScore}</Text>
          </View>
        );
      }) : null}

      {brideYoni && groomYoni ? (function () {
        var bm = YONI_META[brideYoni] || { icon: 'help-circle', color: '#FFB800', si: brideYoni, trait: { en: '', si: '' } };
        var gm = YONI_META[groomYoni] || { icon: 'help-circle', color: '#FFB800', si: groomYoni, trait: { en: '', si: '' } };
        return (
          <View style={{ marginTop: magFactors.length > 0 ? 16 : 4 }}>
            <View style={ns.scHead}>
              <Ionicons name="paw-outline" size={13} color="#F472B6" />
              <Text style={[ns.scHeadText, { color: '#F472B6' }]}>{T.naturesTitle}</Text>
            </View>
            <View style={sty.intimAnimalsSection}>
              <View style={sty.intimAnimalCardNew}>
                <LinearGradient colors={[bm.color + '12', 'transparent']} style={sty.intimAnimalGrad} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
                <View style={[sty.intimAnimalBubble, { borderColor: bm.color + '50', backgroundColor: bm.color + '10' }]}>
                  <Ionicons name={bm.icon} size={22} color={bm.color} />
                </View>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.62)', fontWeight: '700', marginTop: 8 }}>{bName || T.bride}</Text>
                <Text style={[cd.natureName, { color: bm.color }]}>{si ? bm.si : brideYoni}</Text>
                <Text style={sty.intimAnimalDesc}>{si ? bm.trait.si : bm.trait.en}</Text>
              </View>
              <View style={sty.intimMatchCenter}>
                <View style={[sty.intimMatchRing, { borderColor: (yoniScore >= 2 ? '#34D399' : '#E8C97A') + '60' }]}>
                  <Ionicons name={yoniScore >= 2 ? 'heart' : 'heart-half'} size={16} color={yoniScore >= 2 ? '#34D399' : '#E8C97A'} />
                </View>
              </View>
              <View style={sty.intimAnimalCardNew}>
                <LinearGradient colors={[gm.color + '12', 'transparent']} style={sty.intimAnimalGrad} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
                <View style={[sty.intimAnimalBubble, { borderColor: gm.color + '50', backgroundColor: gm.color + '10' }]}>
                  <Ionicons name={gm.icon} size={22} color={gm.color} />
                </View>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.62)', fontWeight: '700', marginTop: 8 }}>{gName || T.groom}</Text>
                <Text style={[cd.natureName, { color: gm.color }]}>{si ? gm.si : groomYoni}</Text>
                <Text style={sty.intimAnimalDesc}>{si ? gm.trait.si : gm.trait.en}</Text>
              </View>
            </View>
            <View style={sty.intimNarrativeBox}>
              <Ionicons name="sparkles" size={12} color="rgba(255,184,0,0.5)" />
              <Text style={sty.intimNarrativeText}>{yoniNarrative}</Text>
            </View>
          </View>
        );
      })() : null}

      {hasMag && mag.summary ? (
        <Text style={ns.noteText}>{si ? (mag.summary.si || mag.summary.en) : (mag.summary.en || mag.summary.si)}</Text>
      ) : null}
    </SectionShell>
  );
}

// ── 05 · LIFE RIGHT NOW ──────────────────────────────────────────
function LifeNowCard({ data, index, delay, language, T, bName, gName }) {
  var si = language === 'si';
  var adv = data.advancedPorondam && data.advancedPorondam.advanced;
  var dc = adv && adv.dashaCompatibility;
  var jm = data.jyotishMatching;
  var bSS = jm && jm.brideSadeSati && jm.brideSadeSati.status;
  var gSS = jm && jm.groomSadeSati && jm.groomSadeSati.status;
  if (!dc && !bSS && !gSS) return null;

  var rows = [];
  function dashaRow(person, name) {
    if (!person || !person.currentDasha) return;
    var benefic = person.isBeneficPeriod === true;
    var color = benefic ? '#34D399' : '#E8C97A';
    rows.push({
      icon: benefic ? 'sunny-outline' : 'cloud-outline', color: color,
      label: benefic ? (si ? 'හොඳ කාලයක්' : 'A good period') : (si ? 'ටිකක් බර කාලයක්' : 'A heavier period'),
      caption: si ? planetLabel(person.currentDasha, true) + ' මහදශාව' : planetLabel(person.currentDasha, false) + ' major period',
      name: name,
    });
  }
  if (dc) {
    dashaRow(dc.bride, bName || T.bride);
    dashaRow(dc.groom, gName || T.groom);
  }
  if (bSS) {
    rows.push({
      icon: 'hourglass-outline', color: '#E8C97A', name: bName || T.bride,
      label: si ? 'තව බර කාලයක් ගෙවෙනවා' : 'Also in a heavier Saturn period',
      caption: si ? 'සාඩේ සති කාලය — කලකින් පහව යනවා' : 'Sade Sati — it passes with time',
    });
  }
  if (gSS) {
    rows.push({
      icon: 'hourglass-outline', color: '#E8C97A', name: gName || T.groom,
      label: si ? 'තව බර කාලයක් ගෙවෙනවා' : 'Also in a heavier Saturn period',
      caption: si ? 'සාඩේ සති කාලය — කලකින් පහව යනවා' : 'Sade Sati — it passes with time',
    });
  }
  if (rows.length === 0) return null;

  var harmony = dc && dc.harmony;
  var harmonyText = harmony === 'harmonious'
    ? (si ? 'දෙදෙනා දැන් ගෙවන කාල එකිනෙකාට උදව් වෙනවා — එකට ලොකු තීරණ ගන්න හොඳ වෙලාවක්.' : 'The periods you are both in now help each other — a good time for big decisions together.')
    : harmony === 'conflicting'
      ? (si ? 'දැන් දෙදෙනා ගෙවන කාල දෙක වෙනස් රිද්මවල. ලොකු තීරණ හදිසියේ නොගෙන, කතා කර ඉවසීමෙන් ගන්න.' : 'Right now your two periods run on different rhythms. Don’t rush big decisions — talk them through patiently.')
      : (si ? 'කාල මිශ්‍රයි — ලොකු තීරණ හෙමින්, දෙදෙනාම එකඟ වී ගන්න.' : 'The timing is mixed — take big decisions slowly, and only together.');

  return (
    <SectionShell index={index} delay={delay} title={T.lifeNowTitle} sub={T.lifeNowSub}>
      {rows.map(function (r, i) {
        return (
          <View key={'ln' + i} style={sty.deepRow}>
            <View style={sty.deepLeft}>
              <View style={[sty.deepIcon, { backgroundColor: r.color + '12', borderColor: r.color + '25' }]}>
                <Ionicons name={r.icon} size={16} color={r.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={sty.deepTitle}>{r.name}</Text>
                <Text style={cd.deepCaption}>{r.caption}</Text>
              </View>
            </View>
            <View style={[sty.deepBadge, { backgroundColor: r.color + '12', borderColor: r.color + '28' }]}>
              <Text style={[sty.deepBadgeText, { color: r.color, fontSize: 10.5 }]}>{r.label}</Text>
            </View>
          </View>
        );
      })}
      {dc ? (
        <View style={cd.harmonyNote}>
          <Ionicons name="people-outline" size={14} color="rgba(232,201,122,0.7)" style={{ marginTop: 2 }} />
          <Text style={cd.harmonyText}>{harmonyText}</Text>
        </View>
      ) : null}
    </SectionShell>
  );
}

// ── 06 · THE DEEPER BOND ─────────────────────────────────────────
function DeeperBondCard({ data, index, delay, language, T, bName, gName }) {
  var si = language === 'si';
  var adv = data.advancedPorondam && data.advancedPorondam.advanced;
  var nc = adv && adv.navamshaCompatibility;
  var mp = adv && adv.marriagePlanetStrength;
  var md = adv && adv.mangalaDosha;
  var jm = data.jyotishMatching;
  var jb = jm && jm.brideMangalDosha;
  var jg = jm && jm.groomMangalDosha;
  if (!nc && !mp && !md && !jb && !jg) return null;

  var rows = [];

  if (nc) {
    var nScore = nc.score || 0;
    var nMax = nc.maxScore || 8;
    var nPct = nMax > 0 ? nScore / nMax : 0;
    var nColor = nPct >= 0.7 ? '#34D399' : nPct >= 0.4 ? '#E8C97A' : '#F59E0B';
    var nDesc = (si ? (nc.descriptionSi || (nc.insightsSi && nc.insightsSi[0])) : null)
      || nc.description || (nc.insights && nc.insights[0])
      || (si ? 'මතුපිට ලකුණුවලට අමතරව, විවාහ ජීවිතය ගැනම බලන ගැඹුරු ගැළපීමයි මේ.' : 'Beyond the surface points, this is the deeper match for married life itself.');
    rows.push({
      icon: 'heart-circle-outline', color: nColor, badge: nScore + '/' + nMax,
      title: si ? 'ඇතුළතම ගැළපීම' : 'Soul-level match',
      caption: si ? 'නවාංශක (D9) — විවාහ ජීවිතය ගැනම බලන කේන්දරය' : 'Navamsha (D9) — the chart that looks at married life itself',
      desc: nDesc,
    });
  }

  if (mp) {
    var mScore = mp.score || 0;
    var mMax = mp.maxScore || 3;
    var mPct = mMax > 0 ? mScore / mMax : 0;
    var mColor = mPct >= 0.7 ? '#34D399' : mPct >= 0.4 ? '#E8C97A' : '#F59E0B';
    var mLabel = mPct >= 0.7 ? (si ? 'ප්‍රබලයි' : 'Strong') : mPct >= 0.4 ? (si ? 'මධ්‍යමයි' : 'Steady') : (si ? 'මෘදුයි' : 'Gentle');
    var mDesc = (si ? mp.assessmentSi : null) || mp.assessment
      || (si ? 'ආදරයටත් කැපවීමටත් උදව් කරන ග්‍රහයෝ දෙදෙනාගේ කේන්දරවල කොතරම් ශක්තිමත්ද කියායි මේ බලන්නේ.' : 'This looks at how strong the planets of love and commitment are in both charts.');
    rows.push({
      icon: 'shield-checkmark-outline', color: mColor, badge: mLabel,
      title: si ? 'කැපවීමේ ශක්තිය' : 'Capacity for commitment',
      caption: si ? 'සිකුරු සහ 7 වැනි ගෙයි අධිපති — ආදරය පෙන්වන ග්‍රහයෝ' : 'Venus & the 7th-house lord — the love planets',
      desc: mDesc,
    });
  }

  // Mars balance — the honest, calm version of the old "Red Flag Check"
  var bHas = md && md.bride ? !!md.bride.hasDosha : (jb ? !!jb.hasDosha : null);
  var gHas = md && md.groom ? !!md.groom.hasDosha : (jg ? !!jg.hasDosha : null);
  var bCancelled = md && md.bride && md.bride.cancelled;
  var gCancelled = md && md.groom && md.groom.cancelled;
  if (bHas !== null || gHas !== null) {
    var bEff = bHas && !bCancelled;
    var gEff = gHas && !gCancelled;
    var marsRow;
    if (!bEff && !gEff) {
      var wasCancelled = (bHas && bCancelled) || (gHas && gCancelled);
      marsRow = {
        icon: 'flame-outline', color: '#34D399', badge: si ? 'සමතුලිතයි' : 'Balanced',
        title: si ? 'කුජ සමතුලිතය' : 'Mars balance',
        caption: si ? 'කුජ (මංගල) දෝෂ පරීක්ෂාව' : 'The mangal (Mars) check',
        desc: wasCancelled
          ? (si ? 'කුජ බලපෑමක් තිබුණත්, කේන්දරයේම වෙනත් හේතු නිසා එය නැති වී ඇති බවයි සම්ප්‍රදාය කියන්නේ.' : 'There is a Mars influence, but tradition reads it as cancelled out by other parts of the chart itself.')
          : (si ? 'දෙදෙනාගේම කුජ පිහිටීම සන්සුන්යි — මෙතැන බය වෙන්න දෙයක් නැහැ.' : 'Both Mars placements are calm — nothing to worry about here.'),
      };
    } else if (bEff && gEff) {
      marsRow = {
        icon: 'flame-outline', color: '#34D399', badge: si ? 'ගැළපී සමනයි' : 'Matched',
        title: si ? 'කුජ සමතුලිතය' : 'Mars balance',
        caption: si ? 'කුජ (මංගල) දෝෂ පරීක්ෂාව' : 'The mangal (Mars) check',
        desc: si ? 'දෙදෙනා තුළම සමාන කුජ ශක්තියක් තිබෙනවා — සම්ප්‍රදායට අනුව එය එකිනෙක සමනය වෙනවා; ප්‍රශ්නයක් නොවේ.' : 'You both carry the same Mars energy — tradition reads this as balancing out. Not a problem.',
      };
    } else {
      var carrier = bEff ? (bName || T.bride) : (gName || T.groom);
      marsRow = {
        icon: 'flame-outline', color: '#F59E0B', badge: si ? 'සැලකිල්ල ඕනෑ' : 'Needs care',
        title: si ? 'කුජ සමතුලිතය' : 'Mars balance',
        caption: si ? 'කුජ (මංගල) දෝෂ පරීක්ෂාව' : 'The mangal (Mars) check',
        desc: si
          ? carrier + 'ගේ කේන්දරයේ කුජ බලය තීව්‍රයි — තරහ ඉක්මනින් ආ හැකියි. ඉවසීමෙන් කතා කිරීම මෙතැන යතුරයි; බැරෑරුම් කියවීමකට පළපුරුදු ජ්‍යෝතිෂවේදියෙකු හමුවීම හොඳයි.'
          : carrier + '’s chart carries strong Mars energy — tempers can rise quickly. Patient talk is the key here; for a serious reading, meeting an experienced astrologer is wise.',
      };
    }
    rows.push(marsRow);
  }

  if (rows.length === 0) return null;

  return (
    <SectionShell index={index} delay={delay} title={T.deepTitle} sub={T.deepSub}>
      {rows.map(function (r, i) {
        return (
          <View key={'db' + i} style={[sty.deepRow, i === rows.length - 1 ? { borderBottomWidth: 0 } : null]}>
            <View style={sty.deepLeft}>
              <View style={[sty.deepIcon, { backgroundColor: r.color + '12', borderColor: r.color + '25' }]}>
                <Ionicons name={r.icon} size={16} color={r.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={sty.deepTitle}>{r.title}</Text>
                <Text style={cd.deepCaption}>{r.caption}</Text>
                <Text style={[sty.deepDesc, { marginTop: 4 }]}>{r.desc}</Text>
              </View>
            </View>
            <View style={[sty.deepBadge, { backgroundColor: r.color + '12', borderColor: r.color + '28' }]}>
              <Text style={[sty.deepBadgeText, { color: r.color, fontSize: 10.5 }]}>{r.badge}</Text>
            </View>
          </View>
        );
      })}
    </SectionShell>
  );
}

// ── 07 · AUSPICIOUS WEDDING WINDOWS ──────────────────────────────
function WeddingWindowsCard({ data, index, delay, language, T }) {
  var si = language === 'si';
  var windows = data.advancedPorondam && data.advancedPorondam.advanced
    && data.advancedPorondam.advanced.weddingWindows
    && data.advancedPorondam.advanced.weddingWindows.favorableWindows;
  if (!windows || windows.length === 0) return null;

  return (
    <SectionShell index={index} delay={delay} title={T.weddingTitle} sub={T.weddingSub}>
      {windows.map(function (w, i) {
        var hasDate = w.end && w.end.length > 0;
        var isBest = w.best === true;
        var color = isBest ? '#34D399' : 'rgba(255,255,255,0.4)';
        return (
          <View key={'ww' + i} style={[cd.weddingRow, i === 0 ? { borderTopWidth: 0, paddingTop: 2 } : null]}>
            <View style={[cd.weddingIcon, { backgroundColor: isBest ? 'rgba(52,211,153,0.14)' : 'rgba(255,255,255,0.04)', borderColor: isBest ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.06)' }]}>
              <Ionicons name={isBest ? 'star' : 'calendar-outline'} size={16} color={color} />
            </View>
            <View style={{ flex: 1 }}>
              {hasDate ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={[cd.weddingDates, { color: isBest ? '#34D399' : '#FFE8B0' }]}>{w.start}  →  {w.end}</Text>
                  {isBest ? (
                    <View style={cd.bestChip}>
                      <Text style={{ fontSize: 10, fontWeight: '900', color: '#34D399' }}>{si ? 'හොඳම' : 'BEST'}</Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                <Text style={{ color: 'rgba(255,255,255,0.68)', fontSize: 13 }}>{si ? (w.startSi || T.noWindows) : T.noWindows}</Text>
              )}
              <Text style={cd.weddingReason}>{si ? (w.reasonSi || w.reason) : w.reason}</Text>
              {w.durationDays > 0 ? <Text style={cd.weddingMeta}>{w.durationDays} {si ? 'දින' : 'days'}</Text> : null}
            </View>
          </View>
        );
      })}
    </SectionShell>
  );
}

// ── 08 · YOUR BIRTH STARS ────────────────────────────────────────
var ELEM_META = {
  Fire: { icon: 'flame', color: '#F97316', si: 'අග්නි' },
  Earth: { icon: 'globe', color: '#A3E635', si: 'පෘථිවි' },
  Air: { icon: 'cloudy', color: '#60A5FA', si: 'වායු' },
  Water: { icon: 'water', color: '#22D3EE', si: 'ජල' },
  Ether: { icon: 'sparkles', color: '#C084FC', si: 'ආකාශ' },
};

var ELEM_METAPHORS = {
  'Fire+Water': { en: 'Steam when you meet — intense and transformative.', si: 'ගින්දරයි දියයි හමු වූ විට හුමාලයක් — තීව්‍රයි, පරිවර්තනීයයි.' },
  'Fire+Fire': { en: 'Two flames — passionate; just mind the pace so neither burns out.', si: 'ගිනිදැල් දෙකක් — ආවේගශීලීයි; දෙදෙනාම නොදැවෙන වේගයක් සොයාගන්න.' },
  'Fire+Earth': { en: 'Fire warms earth — you bring each other to life.', si: 'ගින්දර පොළොව උණුසුම් කරනවා — ඔබ එකිනෙකාට ජීවය දෙනවා.' },
  'Fire+Air': { en: 'Air fans the flame — lively, and always growing.', si: 'සුළඟ ගින්දර අවුළුවනවා — උද්‍යෝගී, නොනවතින වර්ධනයක්.' },
  'Water+Water': { en: 'A deep ocean together — emotionally boundless.', si: 'එකට ගැඹුරු සාගරයක් — හැඟීම්වලට සීමා නැහැ.' },
  'Water+Earth': { en: 'Water nourishes earth — a naturally fertile bond.', si: 'දිය පොළොව පෝෂණය කරනවා — ස්වාභාවිකවම සරුසාර බැඳීමක්.' },
  'Water+Air': { en: 'Mist and breeze — dreamy; a little grounding helps.', si: 'මීදුමයි සුළඟයි — සිහිනමය බැඳීමක්; පොළොවේ පය තැබීම වැදගත්.' },
  'Earth+Earth': { en: 'Solid bedrock — stable and unshakeable.', si: 'ස්ථිර පර්වතයක් — නොසැලෙන, විශ්වාසදායක බැඳීමක්.' },
  'Earth+Air': { en: 'Mountain and wind — steady yet free.', si: 'කන්දයි සුළඟයි — ස්ථාවරත්වයයි නිදහසයි එකට.' },
  'Air+Air': { en: 'Two winds — sparkling conversation; an anchor helps.', si: 'සුළං දෙකක් — අදහස්වල දිලිසීමක්; නැංගුරමක් උපකාරී වෙනවා.' },
};

function BirthStarsCard({ data, index, delay, language, T, bName, gName }) {
  var si = language === 'si';
  if (!data.bride || !data.groom) return null;
  var bride = data.bride;
  var groom = data.groom;
  var be = data.brideEnhanced && data.brideEnhanced.tattvaBalance;
  var ge = data.groomEnhanced && data.groomEnhanced.tattvaBalance;

  function pill(person, name, dotColor) {
    return (
      <View style={sty.profilePill}>
        <View style={[sty.profileDot, { backgroundColor: dotColor }]} />
        <Text style={sty.profileName}>{name}</Text>
        <Text style={sty.profileSign}>{person.rashi ? (si ? person.rashi.sinhala : person.rashi.name) : ''}</Text>
        <Text style={sty.profileStar}>
          {person.nakshatra ? (si ? person.nakshatra.sinhala : person.nakshatra.name) : ''}
          {person.nakshatra && person.nakshatra.pada ? (si ? ' · පාද ' + person.nakshatra.pada : ' · Pada ' + person.nakshatra.pada) : ''}
        </Text>
        <Text style={sty.profileLord}>{si ? 'අධිපති ග්‍රහයා: ' : 'Ruled by '}{person.nakshatra ? planetLabel(person.nakshatra.lord, si) : ''}</Text>
      </View>
    );
  }

  var metaphor = null;
  if (be && ge && be.dominant && ge.dominant) {
    metaphor = ELEM_METAPHORS[be.dominant + '+' + ge.dominant] || ELEM_METAPHORS[ge.dominant + '+' + be.dominant]
      || { en: 'A rare elemental mix — a chemistry of its own.', si: 'දුර්ලභ මූලධාතු සංයෝගයක් — එයටම ආවේණික රසායනයක්.' };
  }

  return (
    <SectionShell index={index} delay={delay} title={T.starsTitle} sub={T.starsSub}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {pill(bride, bName || T.bride, '#F9A8D4')}
        {pill(groom, gName || T.groom, '#93C5FD')}
      </View>
      {be && ge && be.dominant && ge.dominant ? (function () {
        var bEl = ELEM_META[be.dominant] || ELEM_META.Fire;
        var gEl = ELEM_META[ge.dominant] || ELEM_META.Fire;
        return (
          <View style={{ marginTop: 14 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={sty.elemCard}>
                <View style={[sty.elemCircle, { backgroundColor: bEl.color + '18', borderColor: bEl.color + '40' }]}>
                  <Ionicons name={bEl.icon} size={22} color={bEl.color} />
                </View>
                <Text style={[sty.elemName, { color: bEl.color }]}>{si ? bEl.si : be.dominant}</Text>
                <Text style={sty.elemWho}>{bName || T.bride}</Text>
              </View>
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="flash" size={18} color="rgba(232,201,122,0.55)" />
              </View>
              <View style={sty.elemCard}>
                <View style={[sty.elemCircle, { backgroundColor: gEl.color + '18', borderColor: gEl.color + '40' }]}>
                  <Ionicons name={gEl.icon} size={22} color={gEl.color} />
                </View>
                <Text style={[sty.elemName, { color: gEl.color }]}>{si ? gEl.si : ge.dominant}</Text>
                <Text style={sty.elemWho}>{gName || T.groom}</Text>
              </View>
            </View>
            {metaphor ? <Text style={sty.elemMetaphor}>{si ? metaphor.si : metaphor.en}</Text> : null}
          </View>
        );
      })() : null}
    </SectionShell>
  );
}

// ── 09 · FOR THE CURIOUS (collapsed by default) ──────────────────
var PLANET_DRIVE = {
  Sun: { icon: 'sunny', color: '#F97316', en: 'Leadership & recognition', si: 'නායකත්වය සහ පිළිගැනීම' },
  Moon: { icon: 'moon', color: '#93C5FD', en: 'Emotional security & nurturing', si: 'හැඟීම් සුරක්ෂිතභාවය සහ රැකවරණය' },
  Mars: { icon: 'flame', color: '#EF4444', en: 'Courage & achievement', si: 'ධෛර්යය සහ ජයග්‍රහණය' },
  Mercury: { icon: 'chatbubbles', color: '#34D399', en: 'Intellect & communication', si: 'බුද්ධිය සහ සන්නිවේදනය' },
  Jupiter: { icon: 'globe', color: '#FBBF24', en: 'Freedom & expansion', si: 'නිදහස සහ ප්‍රසාරණය' },
  Venus: { icon: 'heart', color: '#F472B6', en: 'Love & beauty', si: 'ආදරය සහ සුන්දරත්වය' },
  Saturn: { icon: 'shield', color: '#A78BFA', en: 'Stability & discipline', si: 'ස්ථාවරත්වය සහ විනය' },
  Rahu: { icon: 'rocket', color: '#FB923C', en: 'Transformation & ambition', si: 'පරිවර්තනය සහ අභිලාෂය' },
  Ketu: { icon: 'eye', color: '#22D3EE', en: 'Inner freedom', si: 'අභ්‍යන්තර නිදහස' },
};

var PASTLIFE_META = {
  healer: { icon: 'medkit', color: '#34D399', en: 'Healer', si: 'සුවකරු' },
  warrior: { icon: 'shield', color: '#EF4444', en: 'Warrior', si: 'රණශූර' },
  teacher: { icon: 'book', color: '#FBBF24', en: 'Teacher', si: 'ගුරුවර' },
  artist: { icon: 'color-palette', color: '#F472B6', en: 'Artist', si: 'කලාකරු' },
  leader: { icon: 'flag', color: '#F97316', en: 'Leader', si: 'නායක' },
  mystic: { icon: 'eye', color: '#C084FC', en: 'Mystic', si: 'රහස්වාදී' },
  merchant: { icon: 'cash', color: '#A3E635', en: 'Merchant', si: 'වෙළෙන්දා' },
  scholar: { icon: 'library', color: '#60A5FA', en: 'Scholar', si: 'විද්වතා' },
  caretaker: { icon: 'heart', color: '#FB923C', en: 'Caretaker', si: 'රැකවරණකරු' },
  explorer: { icon: 'compass', color: '#22D3EE', en: 'Explorer', si: 'ගවේෂක' },
  pioneer: { icon: 'rocket', color: '#F97316', en: 'Pioneer', si: 'පුරෝගාමී' },
  king: { icon: 'trophy', color: '#FBBF24', en: 'Ruler', si: 'පාලක' },
  administrator: { icon: 'briefcase', color: '#64748B', en: 'Administrator', si: 'පරිපාලක' },
  monk: { icon: 'moon', color: '#C084FC', en: 'Monk', si: 'තවුසා' },
  hermit: { icon: 'moon', color: '#A78BFA', en: 'Hermit', si: 'තාපස' },
  seeker: { icon: 'search', color: '#22D3EE', en: 'Seeker', si: 'සොයන්නා' },
  philosopher: { icon: 'bulb', color: '#FBBF24', en: 'Philosopher', si: 'දාර්ශනික' },
  pilgrim: { icon: 'walk', color: '#34D399', en: 'Pilgrim', si: 'වන්දනාකරු' },
  writer: { icon: 'create', color: '#60A5FA', en: 'Writer', si: 'ලේඛක' },
  messenger: { icon: 'chatbubble', color: '#22D3EE', en: 'Messenger', si: 'පණිවිඩකරු' },
  soldier: { icon: 'shield', color: '#EF4444', en: 'Soldier', si: 'සෙබළ' },
  farmer: { icon: 'leaf', color: '#A3E635', en: 'Farmer', si: 'ගොවි' },
  landowner: { icon: 'home', color: '#FB923C', en: 'Landowner', si: 'ඉඩම් හිමි' },
  priest: { icon: 'star', color: '#FBBF24', en: 'Priest', si: 'පූජක' },
  performer: { icon: 'musical-notes', color: '#F472B6', en: 'Performer', si: 'රංගන ශිල්පී' },
  servant: { icon: 'hand-left', color: '#64748B', en: 'Helper', si: 'සේවක' },
  partner: { icon: 'people', color: '#F472B6', en: 'Partner', si: 'හවුල්කරු' },
  diplomat: { icon: 'globe', color: '#60A5FA', en: 'Diplomat', si: 'තානාපති' },
  researcher: { icon: 'flask', color: '#C084FC', en: 'Researcher', si: 'පර්යේෂක' },
  alchemist: { icon: 'flask', color: '#A78BFA', en: 'Alchemist', si: 'රසවාදී' },
  trader: { icon: 'swap-horizontal', color: '#A3E635', en: 'Trader', si: 'වෙළඳ' },
  banker: { icon: 'wallet', color: '#FBBF24', en: 'Banker', si: 'බැංකුකරු' },
  networker: { icon: 'git-network', color: '#22D3EE', en: 'Networker', si: 'ජාලකරු' },
  elder: { icon: 'person', color: '#FB923C', en: 'Elder', si: 'වැඩිහිටි' },
  mediator: { icon: 'git-merge', color: '#34D399', en: 'Mediator', si: 'මධ්‍යස්ථ' },
};

function CuriositiesCard({ data, index, delay, language, T, bName, gName }) {
  var si = language === 'si';
  var [open, setOpen] = useState(false);

  var bj = data.brideAdvanced && data.brideAdvanced.tier1 && data.brideAdvanced.tier1.jaimini;
  var gj = data.groomAdvanced && data.groomAdvanced.tier1 && data.groomAdvanced.tier1.jaimini;
  var bKey = bj && (typeof bj.atmakaraka === 'string' ? bj.atmakaraka : (bj.atmakaraka && bj.atmakaraka.planet));
  var gKey = gj && (typeof gj.atmakaraka === 'string' ? gj.atmakaraka : (gj.atmakaraka && gj.atmakaraka.planet));
  var bpl = data.brideAdvanced && data.brideAdvanced.tier3 && data.brideAdvanced.tier3.pastLife;
  var gpl = data.groomAdvanced && data.groomAdvanced.tier3 && data.groomAdvanced.tier3.pastLife;

  var hasDrives = !!(bKey && gKey);
  var hasPast = !!(bpl && gpl);
  if (!hasDrives && !hasPast) return null;

  function getPastMeta(pl) {
    var themes = pl && (pl.ketuThemes || (pl.pastLife && pl.pastLife.ketuThemes));
    if (!themes || !themes.archetype) return null;
    var parts = String(themes.archetype).toLowerCase().split('/');
    for (var p = 0; p < parts.length; p++) {
      var key = parts[p].trim();
      if (PASTLIFE_META[key]) return PASTLIFE_META[key];
    }
    var name = parts[0] ? parts[0].trim() : '';
    if (!name) return null;
    return { icon: 'star', color: '#FFB800', en: name.charAt(0).toUpperCase() + name.slice(1), si: themes.archetypeSi ? String(themes.archetypeSi).split('/')[0].trim() : name };
  }

  var ba = hasPast ? getPastMeta(bpl) : null;
  var ga = hasPast ? getPastMeta(gpl) : null;

  return (
    <SectionShell
      index={index} delay={delay} title={T.curioTitle} sub={T.curioSub}
      right={(
        <TouchableOpacity
          onPress={function () { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setOpen(!open); }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} activeOpacity={0.7}
        >
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="rgba(255,255,255,0.45)" />
        </TouchableOpacity>
      )}
    >
      {!open ? (
        <TouchableOpacity
          onPress={function () { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setOpen(true); }}
          activeOpacity={0.7} style={{ paddingVertical: 2 }}
        >
          <Text style={{ fontSize: 12.5, color: 'rgba(255,241,208,0.62)', lineHeight: 18 }}>
            {si ? 'හදවතේ ආශාවන් සහ පෙර භව සංකේත බලන්න…' : 'Open the heart-wish and past-life symbols…'}
          </Text>
        </TouchableOpacity>
      ) : (
        <View>
          {hasDrives ? (
            <View>
              <Text style={cd.curioBlockTitle}>{si ? 'හදවතින්ම ඕනෑ දේ' : 'What each of you deeply wants'}</Text>
              {[{ key: bKey, name: bName || T.bride }, { key: gKey, name: gName || T.groom }].map(function (p, i) {
                var drive = PLANET_DRIVE[p.key] || { icon: 'star', color: '#FFB800', en: p.key, si: p.key };
                return (
                  <View key={'sd' + i} style={sty.soulRow}>
                    <View style={[sty.soulIcon, { backgroundColor: drive.color + '15', borderColor: drive.color + '35' }]}>
                      <Ionicons name={drive.icon} size={18} color={drive.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={sty.soulWho}>{p.name}</Text>
                      <Text style={sty.soulDrive}>{si ? drive.si : drive.en}</Text>
                    </View>
                    <Text style={[sty.soulPlanet, { color: drive.color }]}>{planetLabel(p.key, si)}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          {hasPast && ba && ga ? (
            <View>
              <Text style={cd.curioBlockTitle}>{si ? 'පෙර භව දෝංකාර' : 'Past-life echoes'}</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={sty.pastCard}>
                  <View style={[sty.pastIcon, { backgroundColor: ba.color + '15', borderColor: ba.color + '35' }]}>
                    <Ionicons name={ba.icon} size={20} color={ba.color} />
                  </View>
                  <Text style={sty.pastWho}>{bName || T.bride}</Text>
                  <Text style={[sty.pastArch, { color: ba.color }]}>{si ? ba.si : ba.en}</Text>
                </View>
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="infinite" size={20} color="rgba(192,132,252,0.55)" />
                </View>
                <View style={sty.pastCard}>
                  <View style={[sty.pastIcon, { backgroundColor: ga.color + '15', borderColor: ga.color + '35' }]}>
                    <Ionicons name={ga.icon} size={20} color={ga.color} />
                  </View>
                  <Text style={sty.pastWho}>{gName || T.groom}</Text>
                  <Text style={[sty.pastArch, { color: ga.color }]}>{si ? ga.si : ga.en}</Text>
                </View>
              </View>
              <Text style={sty.pastNarrative}>
                {si
                  ? ba.si + ' කෙනෙක් සහ ' + ga.si + ' කෙනෙක් — කලින් හඳුනනවා වගේ දැනෙන බැඳීමක්.'
                  : 'A ' + ba.en.toLowerCase() + ' and a ' + ga.en.toLowerCase() + ' — a bond that feels like you already know each other.'}
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </SectionShell>
  );
}

// ── THE WRITTEN READING — a chaptered reader, not a wall of text ──
function splitReportSections(md) {
  if (!md || typeof md !== 'string') return null;
  var lines = md.replace(/\r\n/g, '\n').split('\n');
  var intro = [];
  var sections = [];
  var current = null;
  for (var i = 0; i < lines.length; i++) {
    var m = lines[i].match(/^#{1,2}\s+(.+?)\s*$/);
    if (m) {
      if (current) sections.push(current);
      current = { title: m[1].trim(), body: [] };
    } else if (current) {
      current.body.push(lines[i]);
    } else {
      intro.push(lines[i]);
    }
  }
  if (current) sections.push(current);
  if (sections.length < 2) return null;

  // Pull a leading emoji/symbol cluster off the title to use as the chapter
  // glyph. Avoids surrogate-pair regex: take everything before the first
  // letter/digit, and only treat it as a glyph if it holds a symbol-range char.
  function splitGlyph(title) {
    var m = title.match(/^([^A-Za-z0-9඀-෿ऀ-ॿ]+)(.+)$/);
    if (!m) return { glyph: null, title: title };
    var lead = m[1].trim();
    var rest = m[2].trim();
    var hasSymbol = false;
    for (var c = 0; c < lead.length; c++) {
      if (lead.charCodeAt(c) >= 0x2190) { hasSymbol = true; break; }
    }
    if (!hasSymbol || !rest) return { glyph: null, title: title };
    return { glyph: lead, title: rest };
  }

  var parsed = sections.map(function (s) {
    var g = splitGlyph(s.title);
    return {
      glyph: g.glyph,
      title: g.title,
      body: s.body.join('\n').trim(),
    };
  }).filter(function (s) { return s.body.length > 0 || s.title.length > 0; });

  return { intro: intro.join('\n').trim(), sections: parsed };
}

function ReportReader({ report, reportLoading, language, T, brideName, groomName, onRetry }) {
  var si = language === 'si';
  var [openMap, setOpenMap] = useState({ 0: true });

  var names = [brideName, groomName].filter(Boolean).join(si ? ' සහ ' : ' & ');

  var isNotice = report === T.reportBusy || report === T.reportFailed;

  var body = null;
  if (reportLoading) {
    body = (
      <View style={sty.reportLoadRow}>
        <CosmicLoader size={24} color="#FF8C00" />
        <Text style={sty.reportLoadText}>{T.generating}</Text>
      </View>
    );
  } else if (isNotice) {
    body = (
      <View>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <Ionicons name="time-outline" size={16} color="#E8C97A" style={{ marginTop: 2 }} />
          <Text style={{ flex: 1, fontSize: 13, lineHeight: 20, color: 'rgba(255,241,208,0.72)' }}>{report}</Text>
        </View>
        {onRetry ? (
          <TouchableOpacity style={cd.retryBtn} onPress={onRetry} activeOpacity={0.85}>
            <Ionicons name="refresh" size={14} color="#1A0F24" />
            <Text style={cd.retryBtnText}>{T.retryReport}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  } else if (!report) {
    body = (
      <View>
        <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12.5, fontStyle: 'italic' }}>
          {si ? 'ලිඛිත වාර්තාව මේ වෙලාවේ නැහැ — පහත බොත්තමෙන් නොමිලේ ලියාගන්න පුළුවන්.' : 'The written report isn’t here right now — you can have it written below, free.'}
        </Text>
        {onRetry ? (
          <TouchableOpacity style={cd.retryBtn} onPress={onRetry} activeOpacity={0.85}>
            <Ionicons name="refresh" size={14} color="#1A0F24" />
            <Text style={cd.retryBtnText}>{T.retryReport}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  } else {
    var parsed = splitReportSections(report);
    var words = String(report).trim().split(/\s+/).length;
    var mins = Math.max(1, Math.round(words / 170));
    var cover = (
      <View style={cd.readerCover}>
        <LinearGradient
          colors={['rgba(232,201,122,0.10)', 'rgba(12,6,18,0.0)']}
          style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
          start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        />
        <Text style={cd.readerKicker}>{T.report}</Text>
        {names ? <Text style={cd.readerNames}>{names}</Text> : null}
        <View style={cd.readerMeta}>
          {parsed ? (
            <View style={cd.readerMetaChip}>
              <Ionicons name="book-outline" size={12} color="rgba(232,201,122,0.8)" />
              <Text style={cd.readerMetaText}>{parsed.sections.length} {T.readerChapters}</Text>
            </View>
          ) : null}
          <View style={cd.readerMetaChip}>
            <Ionicons name="time-outline" size={12} color="rgba(232,201,122,0.8)" />
            <Text style={cd.readerMetaText}>~{mins} {T.readerMin}</Text>
          </View>
        </View>
        <Text style={cd.readerHint}>{T.readerSub}</Text>
      </View>
    );

    if (!parsed) {
      body = (
        <View>
          {cover}
          <MarkdownText variant="readable">{report}</MarkdownText>
        </View>
      );
    } else {
      body = (
        <View>
          {cover}
          {parsed.intro ? (
            <View style={{ marginBottom: 12, paddingHorizontal: 2 }}>
              <MarkdownText variant="readable">{parsed.intro}</MarkdownText>
            </View>
          ) : null}
          {parsed.sections.map(function (s, i) {
            var isOpen = !!openMap[i];
            return (
              <View key={'ch' + i} style={cd.chapter}>
                <TouchableOpacity
                  style={cd.chapterHead}
                  activeOpacity={0.7}
                  onPress={function () {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setOpenMap(function (prev) {
                      var next = { ...prev };
                      next[i] = !prev[i];
                      return next;
                    });
                  }}
                >
                  <View style={cd.chapterGlyph}>
                    {s.glyph
                      ? <Text style={cd.chapterGlyphText}>{s.glyph}</Text>
                      : <Ionicons name="bookmark-outline" size={15} color="rgba(232,201,122,0.8)" />}
                  </View>
                  <Text style={cd.chapterTitle}>{s.title}</Text>
                  <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color="rgba(255,255,255,0.35)" />
                </TouchableOpacity>
                {isOpen ? (
                  <View style={cd.chapterBody}>
                    <MarkdownText variant="readable">{s.body}</MarkdownText>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      );
    }
  }

  return (
    <Animated.View entering={FadeInUp.delay(120).duration(600)}>
      <View style={ns.shell}>
        <LinearGradient
          colors={['rgba(20,12,28,0.55)', 'rgba(10,6,16,0.50)']}
          style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />
        {body}
      </View>
    </Animated.View>
  );
}

// ── METHOD + GUIDANCE FOOTER — the quiet trust anchor ────────────
function MethodFooter({ T }) {
  return (
    <Animated.View entering={FadeInUp.delay(160).duration(600)}>
      <View style={cd.methodWrap}>
        <LinearGradient
          colors={['rgba(16,10,22,0.50)', 'rgba(8,5,14,0.45)']}
          style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />
        <View style={cd.methodHead}>
          <Ionicons name="planet-outline" size={15} color="rgba(232,201,122,0.8)" />
          <Text style={cd.methodTitle}>{T.methodTitle}</Text>
        </View>
        <Text style={cd.methodBody}>{T.methodBody}</Text>
        <View style={cd.guidancePanel}>
          <Ionicons name="people-outline" size={16} color="rgba(232,201,122,0.75)" style={{ marginTop: 1 }} />
          <Text style={cd.guidanceText}>{T.guidanceNote}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

// Person Input Card (with cosmic date/time pickers + CitySearchPicker)
function PersonCard({ label, name, setName, dateStr, setDateStr, timeStr, setTimeStr, city, setCity, T, lang, fieldPrefix, errors, clearFieldError }) {
  var nameField = fieldPrefix + 'Name';
  var dateField = fieldPrefix + 'Date';
  var cityField = fieldPrefix + 'City';
  var nameError = errors && errors[nameField];
  var dateError = errors && errors[dateField];
  var cityError = errors && errors[cityField];
  var accent = fieldPrefix === 'bride' ? '#F9A8D4' : '#93C5FD';
  return (
    <Glass style={sty.personCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: accent, ...boxShadow(accent, { width: 0, height: 0 }, 0.9, 6) }} />
        <Text style={[sty.personLabel, { marginBottom: 0 }]}>{label}</Text>
      </View>
      <Text style={sty.fieldTag}>{lang === 'si' ? 'නම *' : 'Name *'}</Text>
      <TextInput
        style={[sty.nameInput, nameError ? sty.inputError : {}, { marginBottom: nameError ? 6 : 12 }]}
        value={name}
        onChangeText={function(value) { setName(value); if (String(value || '').trim().length >= 2) clearFieldError(nameField); }}
        placeholder={T.namePh}
        placeholderTextColor="rgba(255,255,255,0.2)"
        autoCorrect={false}
        returnKeyType="next"
        maxLength={25}
      />
      {nameError ? <Text style={sty.inlineError}>{nameError}</Text> : null}
      <Text style={sty.fieldTag}>{T.date}</Text>
      <DatePickerField value={dateStr} onChange={function(value) { setDateStr(value); if (value) clearFieldError(dateField); }} lang={lang} />
      {dateError ? <Text style={[sty.inlineError, { marginTop: 6 }]}>{dateError}</Text> : null}
      <Text style={[sty.fieldTag, { marginTop: 12 }]}>{T.time}</Text>
      <TimePickerField value={timeStr} onChange={setTimeStr} lang={lang} />
      <Text style={[sty.fieldTag, { marginTop: 12 }]}>{T.birthPlace}</Text>
      <CitySearchPicker
        selectedCity={city}
        onSelect={function(value) { setCity(value); if (value && value.lat !== null && value.lat !== undefined && value.lng !== null && value.lng !== undefined) clearFieldError(cityField); }}
        lang={lang}
        accentColor="#FF8C00"
        maxHeight={160}
        compact
      />
      {cityError ? <Text style={[sty.inlineError, { marginTop: 6, marginBottom: 0 }]}>{cityError}</Text> : null}
    </Glass>
  );
}

// Locked-vault labels for the couple tease (what "See our full match" reveals).
var TEASE_VAULT_LABELS = {
  en: {
    score: 'Your 20-point match score', allPorondam: 'All 7 porondam, explained',
    magnetism: 'Attraction & chemistry', weddingWindows: 'Best wedding dates',
    bothCharts: 'Both birth charts', aiReport: 'Full written report', pdf: 'Shareable PDF for family',
  },
  si: {
    score: 'ලකුණු 20න් ඔබේ ගැලපීම', allPorondam: 'පොරොන්දම් 7ම, පැහැදිලිව',
    magnetism: 'ආකර්ෂණය සහ රසායනය', weddingWindows: 'විවාහයට හොඳම දින',
    bothCharts: 'දෙදෙනාගේම කේන්දර', aiReport: 'සම්පූර්ණ ලිඛිත වාර්තාව', pdf: 'පවුලට බෙදාගත හැකි PDF',
  },
};

// The warm couple tease shown BEFORE the paywall: the archetype (verdict-
// shaped hook), one real gift, and named locked vaults — never the score.
function PorondamTeaseOverlay({ tease, language, onClose, onProceed }) {
  var si = language === 'si';
  var slice = (si ? tease.si : tease.en) || tease.en || {};
  var arc = slice.archetype || {};
  var counts = slice.counts || {};
  var vaultLabels = si ? TEASE_VAULT_LABELS.si : TEASE_VAULT_LABELS.en;
  var vaults = (tease.lockedVaults || []).map(function (k) { return vaultLabels[k] || k; });

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={teaseSt.overlay}>
      <LinearGradient colors={['#1A0A1E', '#120818', '#08040F']} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
      <ScrollView contentContainerStyle={teaseSt.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={onClose} style={teaseSt.close} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        <Text style={teaseSt.eyebrow}>{si ? 'ඔබ දෙදෙනා' : 'YOU TWO ARE'}</Text>
        <Animated.Text entering={ZoomIn.delay(120).springify()} style={teaseSt.archetype}>{arc.name}</Animated.Text>
        {arc.bandLabel ? (
          <View style={teaseSt.bandPill}><Text style={teaseSt.bandText}>{arc.bandLabel}</Text></View>
        ) : null}
        {arc.essence ? <Text style={teaseSt.essence}>{arc.essence}</Text> : null}

        {slice.topGift ? (
          <View style={teaseSt.giftCard}>
            <Ionicons name="sparkles" size={15} color="#F9D77E" />
            <View style={{ flex: 1 }}>
              <Text style={teaseSt.giftArea}>{slice.topGift.area}</Text>
              <Text style={teaseSt.giftText}>{slice.topGift.text}</Text>
            </View>
          </View>
        ) : null}

        {(counts.gifts > 0 || counts.growthEdges > 0) ? (
          <Text style={teaseSt.countLine}>
            {si
              ? ('තව ශක්ති ' + (counts.gifts || 0) + 'ක් සහ බලාගත යුතු තැන් ' + (counts.growthEdges || 0) + 'ක් හමු විය 🔒')
              : (counts.gifts + ' strengths and ' + counts.growthEdges + ' growth areas found 🔒')}
          </Text>
        ) : null}

        <View style={teaseSt.vaultBox}>
          <Text style={teaseSt.vaultHead}>{si ? 'විවෘත වන දේ' : 'UNLOCK TO SEE'}</Text>
          {vaults.map(function (label, i) {
            return (
              <View key={i} style={teaseSt.vaultRow}>
                <Ionicons name="lock-closed" size={12} color="rgba(244,114,182,0.75)" />
                <Text style={teaseSt.vaultText}>{label}</Text>
              </View>
            );
          })}
        </View>

        <TouchableOpacity activeOpacity={0.88} onPress={onProceed} style={teaseSt.cta}>
          <LinearGradient colors={['#F472B6', '#EC4899', '#DB2777']} style={teaseSt.ctaGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={teaseSt.ctaText}>{si ? 'අපේ සම්පූර්ණ ගැලපීම බලන්න' : 'See our full match'}</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
        <Text style={teaseSt.reassure}>{si ? 'ලකුණු, දින සහ වාර්තාව ඊළඟට' : 'Score, dates & full report next'}</Text>
      </ScrollView>
    </Animated.View>
  );
}

var teaseSt = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 26, paddingVertical: 60 },
  close: { position: 'absolute', top: 46, right: 22, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 2, color: 'rgba(244,114,182,0.85)', marginBottom: 8 },
  archetype: { fontSize: 30, fontWeight: '900', color: '#FFF1F8', textAlign: 'center', lineHeight: 36 },
  bandPill: { marginTop: 12, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12, backgroundColor: 'rgba(244,114,182,0.14)', borderWidth: 1, borderColor: 'rgba(244,114,182,0.35)' },
  bandText: { fontSize: 12, fontWeight: '800', color: '#F9A8D4', letterSpacing: 0.4 },
  essence: { fontSize: 14.5, color: 'rgba(255,255,255,0.78)', textAlign: 'center', lineHeight: 21, marginTop: 14, paddingHorizontal: 6 },
  giftCard: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 20, padding: 14, borderRadius: 14, backgroundColor: 'rgba(249,215,126,0.08)', borderWidth: 1, borderColor: 'rgba(249,215,126,0.22)', alignSelf: 'stretch' },
  giftArea: { fontSize: 11, fontWeight: '800', color: '#F9D77E', letterSpacing: 0.4, marginBottom: 2 },
  giftText: { fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 18 },
  countLine: { fontSize: 12.5, fontWeight: '700', color: 'rgba(255,255,255,0.6)', marginTop: 16, textAlign: 'center' },
  vaultBox: { alignSelf: 'stretch', marginTop: 20, padding: 16, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.035)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  vaultHead: { fontSize: 10, fontWeight: '900', letterSpacing: 1.6, color: 'rgba(244,114,182,0.7)', marginBottom: 10 },
  vaultRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 5 },
  vaultText: { fontSize: 13, color: 'rgba(255,255,255,0.74)', fontWeight: '600' },
  cta: { alignSelf: 'stretch', marginTop: 24, borderRadius: 15, overflow: 'hidden' },
  ctaGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 15 },
  ctaText: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  reassure: { fontSize: 11.5, color: 'rgba(255,255,255,0.62)', marginTop: 12 },
});

// ======= MAIN SCREEN =======
export default function PorondamScreen() {
  var { language } = useLanguage();
  var { isLoggedIn, showPaywall, user } = useAuth();
  var { colors, gradients, resolved } = useTheme();
  var sc = screenColors(colors);
  var T = L[language] || L.en;
  var isDesktop = useDesktopCtx();
  var insets = useScreenInsets();
  var reduced = useReducedMotion();
  var lowEnd = useLowEndDevice();

  var [bDate, setBDate] = useState('1998-01-15');
  var [bTime, setBTime] = useState('08:30');
  var [bName, setBName] = useState('');
  var [bCity, setBCity] = useState(null);

  var [gDate, setGDate] = useState('1998-06-20');
  var [gTime, setGTime] = useState('10:00');
  var [gName, setGName] = useState('');
  var [gCity, setGCity] = useState(null);

  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState(null);
  var [fieldErrors, setFieldErrors] = useState({});
  var [collapsed, setCollapsed] = useState(false);
  var scrollRef = useRef(null);
  var [report, setReport] = useState(null);
  var [reportLoading, setReportLoading] = useState(false);
  var [reportLang, setReportLang] = useState(language || 'en');
  var [porondamId, setPorondamId] = useState(null);
  var [savedChecks, setSavedChecks] = useState([]);
  var [showHistory, setShowHistory] = useState(false);
  var [chartsExpanded, setChartsExpanded] = useState(true);
  var [vibeBusy, setVibeBusy] = useState(false);

  // User's own lagna for compatibility section
  var [myLagnaId, setMyLagnaId] = useState(null);
  var [myLagnaName, setMyLagnaName] = useState('');

  // Free couple tease shown before the paywall (archetype + 1 gift + counts).
  var [teaseData, setTeaseData] = useState(null);
  var teaseResolverRef = useRef(null);

  // Fetch the tease and open the modal. Resolves true when the user taps
  // "See our full match" (→ paywall), false if they dismiss. On any preview
  // failure it resolves true so the normal paid flow is never blocked.
  var showPorondamTease = useCallback(function(brideData, groomData) {
    return api.getPorondamPreview(brideData, groomData)
      .then(function(prev) {
        if (!prev || !prev.success || !prev.data) return true;
        return new Promise(function(resolve) {
          teaseResolverRef.current = resolve;
          setTeaseData(prev.data);
        });
      })
      .catch(function(e) {
        if (__DEV__) console.warn('[Porondam] Tease preview failed (non-critical):', e && e.message);
        return true;
      });
  }, []);

  var resolveTease = useCallback(function(proceed) {
    setTeaseData(null);
    var r = teaseResolverRef.current;
    teaseResolverRef.current = null;
    if (r) r(proceed);
  }, []);

  useEffect(function() {
    if (!user || !user.birthData || !user.birthData.dateTime) return;
    (async function() {
      var applyLagna = function(res) {
        if (res && res.success && res.data && res.data.lagna && res.data.lagna.rashiId) {
          setMyLagnaId(res.data.lagna.rashiId);
          var name = language === 'si' ? (res.data.lagna.sinhala || res.data.lagna.english) : (res.data.lagna.english || res.data.lagna.name);
          setMyLagnaName(name);
          return true;
        }
        return false;
      };
      try {
        // Pro path — the full birth-chart data (subscription-gated).
        var res = await api.getBirthChartBasic(user.birthData.dateTime, user.birthData.lat, user.birthData.lng, language);
        if (applyLagna(res)) return;
      } catch (e) { /* fall through to the free preview */ }
      try {
        // Free path — the lagna identity is free (preview route), so the
        // lagna-compatibility explorer works for everyone.
        var pv = await api.getBirthChartPreview(user.birthData.dateTime, user.birthData.lat, user.birthData.lng);
        applyLagna(pv);
      } catch (e2) { /* silent — explorer simply stays hidden */ }
    })();
  }, [user, language]);

  // ── Load saved porondam: server-first, AsyncStorage fallback ──
  useEffect(function() {
    (async function() {
      // Try server first
      if (user && !user.isAnonymous) {
        try {
          var serverRes = await api.getMyPorondamHistory(10);
          if (serverRes && serverRes.data && serverRes.data.results && serverRes.data.results.length > 0) {
            var serverList = serverRes.data.results.map(function(r) {
              return {
                id: r.id,
                brideName: r.bride?.name || '',
                groomName: r.groom?.name || '',
                brideDate: r.bride?.birthDate || '',
                brideTime: '',
                brideCity: null,
                groomDate: r.groom?.birthDate || '',
                groomTime: '',
                groomCity: null,
                reportLang: r.reportLanguage || null,
                percentage: r.percentage || 0,
                score: r.score || 0,
                maxScore: r.maxScore || 20,
                ratingEmoji: r.ratingEmoji || null,
                hasReport: r.hasReport || false,
                savedAt: r.createdAt || '',
                isServerRecord: true,
              };
            });
            setSavedChecks(serverList);
            if (__DEV__) console.log('[Porondam] Loaded ' + serverList.length + ' results from server');
            return;
          }
        } catch (e) {
          if (__DEV__) console.warn('[Porondam] Server history failed, falling back to local:', e.message);
        }
      }
      // Fallback to AsyncStorage
      try {
        var stored = await AsyncStorage.getItem(PORONDAM_CACHE_KEY);
        if (stored) {
          setSavedChecks(JSON.parse(stored));
        }
      } catch (e) {
        if (__DEV__) console.warn('Failed to load saved porondam:', e);
      }
    })();
  }, [user]);

  // Save a porondam result to cache
  var savePorondamToCache = useCallback(async function(porondamData) {
    try {
      var entry = {
        id: Date.now().toString(),
        brideName: porondamData.brideName || '',
        groomName: porondamData.groomName || '',
        brideDate: porondamData.brideDate,
        brideTime: porondamData.brideTime,
        brideCity: porondamData.brideCity,
        groomDate: porondamData.groomDate,
        groomTime: porondamData.groomTime,
        groomCity: porondamData.groomCity,
        reportLang: porondamData.reportLang,
        data: porondamData.data,
        report: porondamData.report,
        porondamId: porondamData.porondamId,
        savedAt: new Date().toISOString(),
      };
      var updated = [entry].concat(savedChecks).slice(0, MAX_SAVED_PORONDAM);
      await AsyncStorage.setItem(PORONDAM_CACHE_KEY, JSON.stringify(updated));
      setSavedChecks(updated);
    } catch (e) {
      if (__DEV__) console.warn('Failed to save porondam:', e);
    }
  }, [savedChecks]);

  // Delete a saved check (server + local)
  var deleteSavedCheck = useCallback(async function(checkId) {
    try {
      var entry = savedChecks.find(function(c) { return c.id === checkId; });
      if (entry && entry.isServerRecord) {
        try { await api.deletePorondamRecord(checkId); } catch (e) {
          if (__DEV__) console.warn('Server delete failed:', e.message);
        }
      }
      var updated = savedChecks.filter(function(c) { return c.id !== checkId; });
      await AsyncStorage.setItem(PORONDAM_CACHE_KEY, JSON.stringify(updated));
      setSavedChecks(updated);
    } catch (e) {
      if (__DEV__) console.warn('Failed to delete porondam:', e);
    }
  }, [savedChecks]);

  // Load a saved check (fetch full content from server if needed)
  var [loadingCheck, setLoadingCheck] = useState(false);
  var loadSavedCheck = useCallback(async function(entry) {
    if (entry.isServerRecord) {
      setLoadingCheck(true);
      setError(null);
      try {
        var res = await api.getSavedPorondam(entry.id);
        if (res && res.data) {
          var d = res.data;
          // Normalize field names (Firestore uses score/maxScore, UI expects totalScore/maxPossibleScore)
          if (d.totalScore === undefined && d.score !== undefined) d.totalScore = d.score;
          if (d.maxPossibleScore === undefined && d.maxScore !== undefined) d.maxPossibleScore = d.maxScore;
          setBName(d.bride?.name || entry.brideName || '');
          setGName(d.groom?.name || entry.groomName || '');
          setBDate(d.bride?.birthDate || entry.brideDate || '1998-01-15');
          setBTime(entry.brideTime || '08:30');
          setBCity(entry.brideCity || null);
          setGDate(d.groom?.birthDate || entry.groomDate || '1998-06-20');
          setGTime(entry.groomTime || '10:00');
          setGCity(entry.groomCity || null);
          // A failed-report record stores no language — fall back to the APP
          // language, never English, so a free retry writes the right one.
          setReportLang(d.reportLanguage || entry.reportLang || language || 'en');
          setData(d);
          setReport(d.report || null);
          setPorondamId(d.id || entry.id);
          setCollapsed(true);
          setShowHistory(false);
        } else {
          setError('Failed to load saved result');
        }
      } catch (e) {
        if (__DEV__) console.warn('Failed to load server porondam:', e.message);
        setError('Failed to load saved result');
      } finally {
        setLoadingCheck(false);
      }
    } else {
      // Local cached — load directly
      setBName(entry.brideName || 'Bride');
      setGName(entry.groomName || 'Groom');
      setBDate(entry.brideDate || '1998-01-15');
      setBTime(entry.brideTime || '08:30');
      setBCity(entry.brideCity || null);
      setGDate(entry.groomDate || '1998-06-20');
      setGTime(entry.groomTime || '10:00');
      setGCity(entry.groomCity || null);
      setReportLang(entry.reportLang || language || 'en');
      setData(entry.data);
      setReport(entry.report || null);
      setPorondamId(entry.porondamId || null);
      setCollapsed(true);
      setShowHistory(false);
      setError(null);
    }
  }, [language]);

  // Sync report language when app language changes (only when no data yet)
  useEffect(function() {
    if (!data) setReportLang(language || 'en');
  }, [language]);

  function buildDateISO(dateStr, timeStr) {
    return dateStr + 'T' + (timeStr || '12:00') + ':00';
  }

  function clearFieldError(fieldName) {
    setFieldErrors(function(prev) {
      if (!prev || !prev[fieldName]) return prev;
      var next = { ...prev };
      delete next[fieldName];
      return next;
    });
  }

  function validatePorondamForm() {
    var nextErrors = {};
    var brideName = String(bName || '').trim();
    var groomName = String(gName || '').trim();
    if (brideName.length < 2) {
      nextErrors.brideName = language === 'si' ? 'මනාලියගේ නම අකුරු 2කට වඩා ඇතුළත් කරන්න.' : 'Enter the bride name, at least 2 characters.';
    }
    if (groomName.length < 2) {
      nextErrors.groomName = language === 'si' ? 'මනාලයාගේ නම අකුරු 2කට වඩා ඇතුළත් කරන්න.' : 'Enter the groom name, at least 2 characters.';
    }
    if (!bDate) {
      nextErrors.brideDate = language === 'si' ? 'මනාලියගේ උපන් දිනය තෝරන්න.' : 'Select the bride birth date.';
    }
    if (!gDate) {
      nextErrors.groomDate = language === 'si' ? 'මනාලයාගේ උපන් දිනය තෝරන්න.' : 'Select the groom birth date.';
    }
    if (!bCity || bCity.lat === null || bCity.lat === undefined || bCity.lng === null || bCity.lng === undefined) {
      nextErrors.brideCity = language === 'si' ? 'මනාලියගේ උපන් ස්ථානය තෝරන්න.' : 'Select the bride birth place.';
    }
    if (!gCity || gCity.lat === null || gCity.lat === undefined || gCity.lng === null || gCity.lng === undefined) {
      nextErrors.groomCity = language === 'si' ? 'මනාලයාගේ උපන් ස්ථානය තෝරන්න.' : 'Select the groom birth place.';
    }
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  var check = useCallback(async function() {
    if (!validatePorondamForm()) {
      setError(null);
      if (scrollRef.current) scrollRef.current.scrollTo({ y: 0, animated: true });
      return;
    }
    setFieldErrors({});

    var brideData = { birthDate: buildDateISO(bDate, bTime), lat: bCity.lat, lng: bCity.lng, name: String(bName || '').trim() };
    var groomData = { birthDate: buildDateISO(gDate, gTime), lat: gCity.lat, lng: gCity.lng, name: String(gName || '').trim() };
    var entitlementInput = {
      brideBirthDate: brideData.birthDate,
      brideLat: brideData.lat,
      brideLng: brideData.lng,
      groomBirthDate: groomData.birthDate,
      groomLat: groomData.lat,
      groomLng: groomData.lng,
      language: reportLang,
    };

    // ── Check for pending entitlement (retry after failed generation) ──
    var isRetry = false;
    try {
      var entCheck = await api.checkEntitlement('porondam', entitlementInput);
      if (entCheck && entCheck.hasPending) {
        isRetry = true;
        if (__DEV__) console.log('[Porondam] ♻️ Resuming failed generation — no payment needed (' + entCheck.entitlement.retriesLeft + ' retries left)');
      }
    } catch (entErr) {
      // Non-critical — proceed with normal payment flow
      if (__DEV__) console.warn('[Porondam] Entitlement check failed (non-critical):', entErr.message);
    }

    // ── Warm tease before the wall ──────────────────────────────────────
    // Everyone (non-retry) meets their couple-archetype + one gift +
    // locked counts BEFORE the paywall — a cold wall converts worse than a
    // warm one. Awaits the tease modal: "See our full match" → continue,
    // close → abort. If the preview can't load we fall straight through.
    if (!isRetry) {
      var proceed = await showPorondamTease(brideData, groomData);
      if (!proceed) return;
    }

    // ── Pre-payment gate: never take money when the report writer is down ──
    // Asks the server (circuit + daily AI budget) BEFORE the paywall opens.
    if (!isRetry) {
      try {
        var health = await api.getPorondamAiHealth();
        if (health && health.available === false) {
          var waitMin = Math.max(1, Math.ceil((health.retryInSeconds || 120) / 60));
          Alert.alert(
            T.aiDownTitle,
            (health.reason === 'budget' ? T.aiDownBudget : T.aiDownBusy).replace('{min}', String(waitMin))
          );
          return;
        }
      } catch (healthErr) {
        var hStatus = healthErr && healthErr.statusCode;
        if (hStatus === 404 || hStatus === 401 || hStatus === 403) {
          // Older server or auth edge — the gate can't answer here; proceed as before.
          if (__DEV__) console.warn('[Porondam] Health gate unavailable (' + hStatus + '), proceeding');
        } else {
          // Our server is unreachable — the check itself would fail. Don't charge blind.
          Alert.alert(T.aiDownTitle, T.aiDownNetwork);
          return;
        }
      }
    }

    // Show paywall unless this is a retry (pending entitlement = free retry).
    // Porondam is a one-time purchase — a subscription does NOT include it,
    // so every user (subscriber or not) buys each check individually.
    if (!isRetry) {
      try {
        await showPaywall('porondam');
      } catch (e) {
        // User cancelled payment — do not proceed
        return;
      }
    }

    // Payment succeeded — now run the compatibility check
    try {
      setLoading(true); setError(null); setData(null); setReport(null); setPorondamId(null);

      var checkRes = await api.checkPorondam(brideData, groomData);
      setData(checkRes.data);
      if (checkRes.porondamId) setPorondamId(checkRes.porondamId);

      // Fire AI report generation (with 1 automatic retry on failure)
      setReportLoading(true);
      var reportRes = null;
      try {
        reportRes = await api.getPorondamReport(checkRes.data, reportLang, brideData.name, groomData.name, checkRes.porondamId || undefined, entitlementInput);
        setReport(reportRes.report);
        if (reportRes.porondamId) setPorondamId(reportRes.porondamId);
      } catch (rErr) {
        var providerBusy = rErr.code === 'AI_PROVIDER_RATE_LIMIT' || rErr.code === 'AI_PROVIDER_UNAVAILABLE' || rErr.statusCode === 429 || rErr.statusCode === 503;
        if (providerBusy) {
          if (__DEV__) console.warn('[Porondam] AI provider busy; retry is preserved:', rErr.message);
          setReport(T.reportBusy);
          reportRes = null;
        } else {
          if (__DEV__) console.warn('[Porondam] AI report failed, retrying in 3s:', rErr.message);
          try {
            await new Promise(function(r) { setTimeout(r, 3000); });
            reportRes = await api.getPorondamReport(checkRes.data, reportLang, brideData.name, groomData.name, checkRes.porondamId || undefined, entitlementInput);
            setReport(reportRes.report);
            if (reportRes.porondamId) setPorondamId(reportRes.porondamId);
          } catch (rErr2) {
            setReport(T.reportFailed);
          }
        }
      } finally {
        setReportLoading(false);
      }

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCollapsed(true);

      // Save to cache
      savePorondamToCache({
        brideName: brideData.name,
        groomName: groomData.name,
        brideDate: bDate,
        brideTime: bTime,
        brideCity: bCity,
        groomDate: gDate,
        groomTime: gTime,
        groomCity: gCity,
        reportLang: reportLang,
        data: checkRes.data,
        report: reportRes?.report || null,
        porondamId: checkRes.porondamId || reportRes?.porondamId || null,
      });

      setTimeout(function() { if (scrollRef.current) scrollRef.current.scrollTo({ y: 0, animated: true }); }, 300);
    } catch (e) {
      var msg = e.message || 'Error';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [bDate, bTime, gDate, gTime, bCity, gCity, bName, gName, T, language, reportLang, user, showPaywall, showPorondamTease]);

  // ── Free in-place report retry — the check result stays; only the writing
  // reruns. The saved entitlement (or active subscription) covers it, so the
  // user is never asked to pay again.
  var retryReport = useCallback(async function() {
    if (!data || reportLoading) return;
    setReportLoading(true);
    try {
      var entitlementInput = {
        brideBirthDate: buildDateISO(bDate, bTime),
        brideLat: bCity ? bCity.lat : undefined,
        brideLng: bCity ? bCity.lng : undefined,
        groomBirthDate: buildDateISO(gDate, gTime),
        groomLat: gCity ? gCity.lat : undefined,
        groomLng: gCity ? gCity.lng : undefined,
        language: reportLang,
      };
      var res = await api.getPorondamReport(data, reportLang, bName, gName, porondamId || undefined, entitlementInput);
      setReport(res.report);
      if (res.porondamId) setPorondamId(res.porondamId);
    } catch (e) {
      var busy = e.code === 'AI_PROVIDER_RATE_LIMIT' || e.code === 'AI_PROVIDER_UNAVAILABLE' || e.statusCode === 429 || e.statusCode === 503;
      setReport(busy ? T.reportBusy : T.reportFailed);
    } finally {
      setReportLoading(false);
    }
  }, [data, reportLoading, bDate, bTime, gDate, gTime, bCity, gCity, bName, gName, reportLang, porondamId, T]);

  
  // â”€â”€ DOWNLOAD PORONDAM AS PDF â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  var handleDownloadPDF = async function() {
    if (!data) return;
    try {
      var isSi = language === 'si';

      var logoB64 = await loadLogoBase64();

      var html = generatePorondamHTML({
        lang: language,
        data: data,
        brideName: bName || (isSi ? '\u0DB8\u0DB1\u0DCF\u0DBD\u0DD2\u0DBA' : 'Bride'),
        groomName: gName || (isSi ? '\u0DB8\u0DB1\u0DCF\u0DBD\u0DBA\u0DCF' : 'Groom'),
        report: report,
        logoBase64: logoB64,
      });

      var fileName = 'NekathAI_Porondam_' + (bName || 'Bride').replace(/\s+/g, '_') + '_' + (gName || 'Groom').replace(/\s+/g, '_') + '.pdf';

      if (Platform.OS === 'web') {
        var printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.print();
        }
      } else {
        // A4 dimensions in points (1 inch = 72pt). Explicit dimensions help
        // the Android renderer; without them some devices reject the print
        // when HTML is large or contains heavy SVG.
        var printOpts = { html: html, base64: false, width: 595, height: 842 };
        var result;
        try {
          result = await Print.printToFileAsync(printOpts);
        } catch (printErr) {
          // Fallback: retry once with a minimal HTML (text-only) so the user
          // still gets a PDF rather than losing their generated content.
          if (__DEV__) console.warn('[Porondam] printToFileAsync failed, retrying with minimal HTML:', printErr && printErr.message);
          var fallback = '<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Porondam</title>'
            + '<style>body{font-family:sans-serif;padding:24px;color:#222;line-height:1.6;}h1{color:#7C3AED;}h2{margin-top:18px;}p{margin:6px 0;}</style>'
            + '</head><body>'
            + (logoB64 ? '<img src="data:image/png;base64,' + logoB64 + '" width="56" height="56" style="border-radius:12px;"/>' : '')
            + '<h1>' + (isSi ? '\u0DC3\u0DB6\u0DB3\u0DAD\u0DCF \u0D9C\u0DD0\u0DBD\u0DB4\u0DD3\u0DB8\u0DCA \u0DC0\u0DCF\u0DBB\u0DCA\u0DAD\u0DCF\u0DC0' : 'Relationship Match Report') + '</h1>'
            + '<p><b>' + (bName || 'Bride') + ' &amp; ' + (gName || 'Groom') + '</b></p>'
            + '<p>' + (isSi ? '\u0DBD\u0D9A\u0DD4\u0DAB\u0DD4' : 'Score') + ': ' + (data.totalScore || 0) + ' / ' + (data.maxPossibleScore || 20) + ' (' + (data.percentage || 0) + '%)</p>'
            + '<p>' + (data.ratingSinhala || data.rating || '') + '</p>'
            + (report && report.summary ? '<h2>' + (isSi ? '\u0DC3\u0DCF\u0DBB\u0DCF\u0D82\u0DC1\u0DBA' : 'Summary') + '</h2><p>' + String(report.summary).replace(/[<>]/g, '') + '</p>' : '')
            + '</body></html>';
          result = await Print.printToFileAsync({ html: fallback, base64: false, width: 595, height: 842 });
        }
        await Sharing.shareAsync(result.uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: fileName });
      }
    } catch (err) {
      var isSiErr = language === 'si';
      Alert.alert(
        isSiErr ? '\u0DAF\u0DDD\u0DC2\u0DBA\u0D9A\u0DD2' : 'Error',
        isSiErr ? 'PDF \u0DC3\u0DD0\u0D9A\u0DC3\u0DD3\u0DB8\u0DA7 \u0D85\u0DC3\u0DB8\u0DAD\u0DCA \u0DC0\u0DD2\u0DBA. \u0DB1\u0DD0\u0DC0\u0DAD \u0D8B\u0DAD\u0DCA\u0DC3\u0DC4 \u0D9A\u0DBB\u0DB1\u0DCA\u0DB1.' : 'Failed to generate PDF. Please try again.'
      );
    }
  };

  var shareResult = async function() {
    try {
      var si = language === 'si';
      var cr = data.coupleReading && (data.coupleReading[si ? 'si' : 'en'] || data.coupleReading.en);
      var arc = cr && cr.archetype;
      var names = [bName, gName].filter(Boolean).join(si ? ' \u0DC3\u0DC4 ' : ' & ');
      var verdict = getVerdictPhrase(data, si);
      // The plain verdict phrase leads; the archetype is a secondary "bond style" line.
      var msg = (names ? names + ' \u2014 ' : '') + verdict.text + '\n';
      if (arc) {
        msg += (si ? '\u0DB6\u0DD0\u0DB3\u0DD3\u0DB8\u0DDA \u0DC0\u0DD2\u0DAF\u0DD2\u0DBA: ' : 'Bond style: ') + arc.name + '\n' + arc.essence + '\n';
      }
      msg += '\n' + (si ? '\u0DC3\u0DB8\u0DCA\u0DB4\u0DCA\u200D\u0DBB\u0DAF\u0DCF\u0DBA\u0DD2\u0D9A \u0DB4\u0DDC\u0DBB\u0DDC\u0DB1\u0DCA\u0DAF\u0DB8\u0DCA: ' : 'Traditional porondams: ') + data.totalScore + '/' + data.maxPossibleScore
        + '\n\nGrahachara';
      await Share.share({ message: msg });
    } catch (e) {}
  };

  // \u2500\u2500 Viral "Vibe Check" \u2014 mint a 7-day link seeded with the first person's
  // birth details. The recipient opens it, adds their own details, and sees the
  // match instantly \u2014 pulling a brand-new user into the app. Growth loop.
  var sendVibeCheck = async function() {
    if (vibeBusy) return;
    var si = language === 'si';
    try {
      setVibeBusy(true);
      var senderName = (bName || '').trim() || (si ? '\u0DB8\u0DB8' : 'Me');
      var senderBirth = buildDateISO(bDate, bTime);
      var lat = bCity ? bCity.lat : undefined;
      var lng = bCity ? bCity.lng : undefined;
      var res = await api.createVibeLink(senderName, senderBirth, lat, lng);
      var link = res && res.data;
      if (!link || !link.shareUrl) throw new Error('no link');
      var invite = si
        ? senderName + ' \u0D94\u0DB6\u0DDA \u0D9C\u0DCA\u200D\u0DBB\u0DC4 \u0D9C\u0DD0\u0DC5\u0DB4\u0DD3\u0DB8 \u0DB6\u0DBD\u0DB1\u0DCA\u0DB1 \u0D9A\u0DD0\u0DB8\u0DAD\u0DD2\u0DBA\u0DD2 \u2728\n\n\u0D94\u0DB6\u0DDA \u0D8B\u0DB4\u0DB1\u0DCA \u0DC0\u0DD2\u0DC3\u0DCA\u0DAD\u0DBB \u0DAF\u0DCF\u0DBD\u0DCF \u0D9A\u0DCA\u0DC2\u0DAB\u0DD2\u0D9A\u0DC0 \u0D9C\u0DD0\u0DC5\u0DB4\u0DD3\u0DB8 \u0DB6\u0DBD\u0DB1\u0DCA\u0DB1:\n' + link.shareUrl + '\n\nGrahachara \uD83E\uDE90'
        : senderName + ' wants to check your star compatibility \u2728\n\nTap, add your birth details, and see your match instantly:\n' + link.shareUrl + '\n\nGrahachara \uD83E\uDE90';
      await Share.share({ message: invite, url: link.shareUrl });
    } catch (e) {
      Alert.alert(
        si ? '\u0DAF\u0DDD\u0DC2\u0DBA\u0D9A\u0DD2' : 'Something went wrong',
        si ? 'Vibe Check \u0DC3\u0DB6\u0DD0\u0DB3\u0DD2\u0DBA \u0DC3\u0DD1\u0DAF\u0DD2\u0DBA \u0DB1\u0DDC\u0DC4\u0DD0\u0D9A\u0DD2 \u0DC0\u0DD2\u0DBA. \u0DB1\u0DD0\u0DC0\u0DAD \u0D8B\u0DAD\u0DCA\u0DC3\u0DCF\u0DC4 \u0D9A\u0DBB\u0DB1\u0DCA\u0DB1.' : "Couldn't create the Vibe Check link. Please try again."
      );
    } finally {
      setVibeBusy(false);
    }
  };

  // ── FULL SCREEN LOADING ─────────────────────────────────
  if (loading) {
    return (
      <DesktopScreenWrapper routeName="porondam">
        <View style={{ flex: 1, backgroundColor: colors.bg, overflow: 'hidden' }}>
          <CosmicBackground reduced={reduced} lowEnd={lowEnd} variant="golden" />
          <LinearGradient
            colors={['rgba(4,3,12,0.20)', 'rgba(4,3,12,0.05)', 'rgba(4,3,12,0.42)']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <ScrollView contentContainerStyle={[lsStyles.loadingScreen, !isDesktop && { paddingTop: insets.contentTop, paddingBottom: insets.contentBottom }]} showsVerticalScrollIndicator={false} bounces={false}>
            <PorondamCosmicLoader brideName={bName} groomName={gName} language={language} reduced={reduced} lowEnd={lowEnd} />
          </ScrollView>
        </View>
      </DesktopScreenWrapper>
    );
  }


  // ── FULL RESULT SCREEN — the report lives on its OWN page, never under the
  //    input form. Reached once a check produces data + collapsed.
  if (data && collapsed) {
    return (
    <DesktopScreenWrapper routeName="porondam">
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <CosmicBackground reduced={reduced} lowEnd={lowEnd} />
      <ScrollView ref={scrollRef} style={sty.flex} contentContainerStyle={[sty.scroll, isDesktop && sty.scrollDesktop, !isDesktop && { paddingTop: insets.contentTop, paddingBottom: insets.contentBottom }]} showsVerticalScrollIndicator={false}>
        <View style={[sty.scrollInner, isDesktop && sty.scrollInnerDesktop]}>

          {/* Back to the input form */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={function () { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setCollapsed(false); }} style={sty.resultBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={20} color={sc.iconAccent} />
              <Text style={[sty.resultBackText, { color: sc.iconAccent }]}>{T.backToForm}</Text>
            </TouchableOpacity>
            {savedChecks.length > 0 ? (
              <TouchableOpacity onPress={function () { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setShowHistory(true); setCollapsed(false); setData(null); setReport(null); setPorondamId(null); }} style={sty.resultBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.7}>
                <Ionicons name="time-outline" size={16} color={sc.iconAccent} />
                <Text style={[sty.resultBackText, { color: sc.iconAccent, fontSize: 12 }]}>{savedChecks.length}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {error && <Glass><Text style={sty.errorText}>{error}</Text></Glass>}

        {data && !loading && (function () {
          var cr = data.coupleReading && (data.coupleReading[language === 'si' ? 'si' : 'en'] || data.coupleReading.en);
          // Older saved results carry no coupleReading — derive the archetype on
          // the device (same lagna-first rule as the server) so the verdict is
          // never a bare one-word rating.
          if (!cr || !cr.archetype) {
            var fbBride = (data.brideChart && data.brideChart.lagnaRashiId) || (data.bride && data.bride.rashi && data.bride.rashi.id);
            var fbGroom = (data.groomChart && data.groomChart.lagnaRashiId) || (data.groom && data.groom.rashi && data.groom.rashi.id);
            if (fbBride && fbGroom) {
              cr = {
                archetype: deriveLagnaArchetype(fbBride, fbGroom, language),
                gifts: (cr && cr.gifts) || [],
                nurture: (cr && cr.nurture) || [],
                forwardPaths: (cr && cr.forwardPaths) || [],
                traditionalCount: { score: data.totalScore != null ? data.totalScore : null, max: data.maxPossibleScore || 20 },
              };
            }
          }
          var glanceRows = buildGlance(data, cr, language, T);
          var scContent = buildStrengthsCare(data, cr, language);
          var adv = data.advancedPorondam && data.advancedPorondam.advanced;
          var jm = data.jyotishMatching;
          var yoniF = (data.factors || []).find(function (f) { return f.name === 'Yoni'; });
          var dcG = adv && adv.dashaCompatibility;
          var bjG = data.brideAdvanced && data.brideAdvanced.tier1 && data.brideAdvanced.tier1.jaimini;
          var gjG = data.groomAdvanced && data.groomAdvanced.tier1 && data.groomAdvanced.tier1.jaimini;
          var bplG = data.brideAdvanced && data.brideAdvanced.tier3 && data.brideAdvanced.tier3.pastLife;
          var gplG = data.groomAdvanced && data.groomAdvanced.tier3 && data.groomAdvanced.tier3.pastLife;

          // Chapters render in reading order and are numbered like a report.
          // Guards mirror each card's own availability check so numbers never skip.
          var chapters = [];
          if (glanceRows.length > 0) {
            chapters.push(function (ix, d) { return <GlanceCard key="glance" index={ix} delay={d} rows={glanceRows} T={T} />; });
          }
          if (scContent) {
            chapters.push(function (ix, d) { return <StrengthsCareCard key="sc" index={ix} delay={d} content={scContent} T={T} />; });
          }
          if ((data.factors || []).length > 0) {
            chapters.push(function (ix, d) { return <SignalsCard key="signals" index={ix} delay={d} data={data} language={language} T={T} />; });
          }
          if ((data.magnetism && data.magnetism.totalScore != null && data.magnetism.maxScore) || (yoniF && yoniF.brideYoni)) {
            chapters.push(function (ix, d) { return <AttractionCard key="attraction" index={ix} delay={d} data={data} language={language} T={T} bName={bName} gName={gName} />; });
          }
          if ((dcG && ((dcG.bride && dcG.bride.currentDasha) || (dcG.groom && dcG.groom.currentDasha)))
            || (jm && ((jm.brideSadeSati && jm.brideSadeSati.status) || (jm.groomSadeSati && jm.groomSadeSati.status)))) {
            chapters.push(function (ix, d) { return <LifeNowCard key="lifenow" index={ix} delay={d} data={data} language={language} T={T} bName={bName} gName={gName} />; });
          }
          if ((adv && (adv.navamshaCompatibility || adv.marriagePlanetStrength || adv.mangalaDosha))
            || (jm && (jm.brideMangalDosha || jm.groomMangalDosha))) {
            chapters.push(function (ix, d) { return <DeeperBondCard key="deeper" index={ix} delay={d} data={data} language={language} T={T} bName={bName} gName={gName} />; });
          }
          if (adv && adv.weddingWindows && adv.weddingWindows.favorableWindows && adv.weddingWindows.favorableWindows.length > 0) {
            chapters.push(function (ix, d) { return <WeddingWindowsCard key="wedding" index={ix} delay={d} data={data} language={language} T={T} />; });
          }
          if (data.bride && data.groom) {
            chapters.push(function (ix, d) { return <BirthStarsCard key="stars" index={ix} delay={d} data={data} language={language} T={T} bName={bName} gName={gName} />; });
          }
          if ((bjG && gjG && bjG.atmakaraka && gjG.atmakaraka) || (bplG && gplG)) {
            chapters.push(function (ix, d) { return <CuriositiesCard key="curio" index={ix} delay={d} data={data} language={language} T={T} bName={bName} gName={gName} />; });
          }

          return (
            <View>
              {/* The verdict — couple archetype leads, the X/20 stands by as a quiet credential */}
              <VerdictHero data={data} reading={cr} brideName={bName} groomName={gName} language={language} T={T} onShare={shareResult} />

              {/* Actions */}
              <Animated.View entering={FadeIn.delay(200).duration(400)}>
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 18 }}>
                  <TouchableOpacity
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,140,0,0.20)', backgroundColor: 'rgba(255,140,0,0.05)' }}
                    activeOpacity={0.7}
                    onPress={function () {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setCollapsed(false); setData(null); setReport(null); setPorondamId(null); setError(null); setShowHistory(false);
                    }}>
                    <Ionicons name="refresh" size={15} color="#FF8C00" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#FF8C00', fontSize: 13, fontWeight: '700' }}>{language === 'si' ? 'අලුත් ගැළපීමක්' : 'New Check'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,184,0,0.35)', backgroundColor: 'rgba(255,184,0,0.08)' }}
                    activeOpacity={0.7}
                    onPress={handleDownloadPDF}>
                    <Ionicons name="download-outline" size={15} color="#FFB800" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#FFB800', fontSize: 13, fontWeight: '700' }}>{language === 'si' ? 'PDF බාගන්න' : 'Download PDF'}</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>

              {/* Viral Vibe Check invite — a partner opens the link, enters their own
                  birth details, sees the match, and becomes a new user. Growth loop. */}
              <Animated.View entering={FadeIn.delay(260).duration(400)}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={sendVibeCheck}
                  disabled={vibeBusy}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(37,211,102,0.28)', backgroundColor: 'rgba(37,211,102,0.07)', marginBottom: 18, opacity: vibeBusy ? 0.6 : 1 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(37,211,102,0.14)', borderWidth: 1, borderColor: 'rgba(37,211,102,0.30)' }}>
                    <Ionicons name={vibeBusy ? 'hourglass-outline' : 'heart-circle'} size={22} color="#25D366" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.95)', fontSize: 13.5, fontWeight: '800' }}>{language === 'si' ? 'තව කෙනෙක් සමඟ ගැළපීම බලන්නද?' : 'Check your vibe with someone else?'}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.68)', fontSize: 11.5, marginTop: 2, lineHeight: 15 }}>{language === 'si' ? 'WhatsApp සබැඳියක් යවන්න — ඔවුන් උපන් විස්තර දැම්මාම ක්ෂණිකව ගැළපීම පෙනේ.' : 'Send a WhatsApp link — they add their details and see the match instantly.'}</Text>
                  </View>
                  <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                </TouchableOpacity>
              </Animated.View>

              {/* The two birth charts — shown first, the traditional way */}
              <TouchableOpacity onPress={function () { setChartsExpanded(!chartsExpanded); LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); }} activeOpacity={0.7} style={sty.chartsToggle}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={sty.chartsToggleIcon}><Ionicons name="grid" size={13} color="#FF8C00" /></View>
                  <Text style={sty.chartsToggleText}>{language === 'si' ? 'උපන් කේන්දර දෙක' : 'The Two Birth Charts'}</Text>
                </View>
                <Ionicons name={chartsExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
              {chartsExpanded && <View style={[sty.charts, WIDE && sty.chartsWide]}>
                {data.brideChart && data.brideChart.rashiChart && (
                  <Animated.View entering={FadeInUp.delay(200).duration(600).springify()} style={WIDE ? sty.chartCol : undefined}>
                    <Glass style={sty.chartCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#F9A8D4' }} />
                        <Text style={sty.chartTitle}>{T.brideChart}</Text>
                      </View>
                      <Text style={sty.chartSubLabel}>{language === 'si' ? 'උපන් කේන්දරය (D1)' : 'Birth chart (D1)'}</Text>
                      <View style={{ alignItems: 'center' }}>
                        <SriLankanChart rashiChart={data.brideChart.rashiChart} lagnaRashiId={data.brideChart.lagnaRashiId} language={language}
                          chartSize={WIDE ? Math.min(320, (W - 140) / 2) : MOBILE_CHART} />
                      </View>
                      {data.brideChart.navamshaChart && (
                        <>
                          <View style={sty.chartDivider} />
                          <Text style={sty.chartSubLabel}>{language === 'si' ? 'නවාංශකය (D9) — විවාහ ජීවිතයේ කේන්දරය' : 'Navamsha (D9) — the marriage chart'}</Text>
                          <View style={{ alignItems: 'center' }}>
                            <SriLankanChart rashiChart={data.brideChart.navamshaChart} lagnaRashiId={data.brideChart.navamshaLagnaId || data.brideChart.lagnaRashiId} language={language}
                              chartSize={WIDE ? Math.min(320, (W - 140) / 2) : MOBILE_CHART} />
                          </View>
                        </>
                      )}
                    </Glass>
                  </Animated.View>
                )}
                {WIDE && (
                  <Animated.View entering={ZoomIn.delay(500).duration(700)} style={[sty.heartBridge, sty.heartBridgeWide]}>
                    <Ionicons name="heart" size={22} color="#F472B6" />
                  </Animated.View>
                )}
                {!WIDE && data.brideChart && data.groomChart && (
                  <Animated.View entering={ZoomIn.delay(400).duration(500)} style={{ alignItems: 'center', paddingVertical: 6 }}>
                    <View style={{ width: 1, height: 20, backgroundColor: 'rgba(255,140,0,0.15)' }} />
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(244,114,182,0.12)', alignItems: 'center', justifyContent: 'center', marginVertical: 4, borderWidth: 1, borderColor: 'rgba(244,114,182,0.25)' }}>
                      <Ionicons name="heart" size={16} color="#F472B6" />
                    </View>
                    <View style={{ width: 1, height: 20, backgroundColor: 'rgba(255,140,0,0.15)' }} />
                  </Animated.View>
                )}
                {data.groomChart && data.groomChart.rashiChart && (
                  <Animated.View entering={FadeInUp.delay(400).duration(600).springify()} style={WIDE ? sty.chartCol : undefined}>
                    <Glass style={sty.chartCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#93C5FD' }} />
                        <Text style={sty.chartTitle}>{T.groomChart}</Text>
                      </View>
                      <Text style={sty.chartSubLabel}>{language === 'si' ? 'උපන් කේන්දරය (D1)' : 'Birth chart (D1)'}</Text>
                      <View style={{ alignItems: 'center' }}>
                        <SriLankanChart rashiChart={data.groomChart.rashiChart} lagnaRashiId={data.groomChart.lagnaRashiId} language={language}
                          chartSize={WIDE ? Math.min(320, (W - 140) / 2) : MOBILE_CHART} />
                      </View>
                      {data.groomChart.navamshaChart && (
                        <>
                          <View style={sty.chartDivider} />
                          <Text style={sty.chartSubLabel}>{language === 'si' ? 'නවාංශකය (D9) — විවාහ ජීවිතයේ කේන්දරය' : 'Navamsha (D9) — the marriage chart'}</Text>
                          <View style={{ alignItems: 'center' }}>
                            <SriLankanChart rashiChart={data.groomChart.navamshaChart} lagnaRashiId={data.groomChart.navamshaLagnaId || data.groomChart.lagnaRashiId} language={language}
                              chartSize={WIDE ? Math.min(320, (W - 140) / 2) : MOBILE_CHART} />
                          </View>
                        </>
                      )}
                    </Glass>
                  </Animated.View>
                )}
              </View>}

              {/* Numbered chapters */}
              {chapters.map(function (renderChapter, i) {
                return renderChapter((i + 1 < 10 ? '0' : '') + (i + 1), 120 + i * 50);
              })}

              {/* The written reading — a chaptered reader, not a wall of text */}
              <ReportReader report={report} reportLoading={reportLoading} language={language} T={T} brideName={bName} groomName={gName} onRetry={retryReport} />

              {/* How it's made + whose decision it is */}
              <MethodFooter T={T} />
            </View>
          );
        })()}

          <View style={{ height: isDesktop ? 32 : 120 }} />
        </View>
      </ScrollView>
    </View>
    </DesktopScreenWrapper>
    );
  }

  var validationItems = Object.keys(fieldErrors || {}).map(function(key) { return fieldErrors[key]; });

  return (
    <DesktopScreenWrapper routeName="porondam">
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} enabled={Platform.OS === 'ios'}>
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <CosmicBackground reduced={reduced} lowEnd={lowEnd} />
      <ScrollView ref={scrollRef} style={sty.flex} contentContainerStyle={[sty.scroll, isDesktop && sty.scrollDesktop, !isDesktop && { paddingTop: insets.contentTop, paddingBottom: insets.contentBottom }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
        <View style={[sty.scrollInner, isDesktop && sty.scrollInnerDesktop]}>

        <Animated.View entering={FadeInDown.duration(600)}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={[sty.title, { color: sc.sectionTitle }]}>{T.title}</Text>
              <Text style={[sty.subtitle, { color: sc.labelColor }]}>{T.subtitle}</Text>
            </View>
            {savedChecks.length > 0 && !collapsed && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: showHistory ? 'rgba(248,113,113,0.10)' : colors.accentMuted, borderWidth: 1, borderColor: showHistory ? 'rgba(248,113,113,0.35)' : colors.borderAccent, marginTop: 4 }}
                onPress={function() {
                  var next = !showHistory;
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setShowHistory(next);
                  if (next && scrollRef.current) setTimeout(function() { scrollRef.current && scrollRef.current.scrollTo({ y: 0, animated: true }); }, 60);
                }} activeOpacity={0.7}>
                <Ionicons name={showHistory ? 'close' : 'time-outline'} size={14} color={showHistory ? '#F87171' : sc.iconAccent} />
                <Text style={{ color: showHistory ? '#F87171' : sc.iconAccent, fontSize: 11.5, fontWeight: '800' }}>
                  {showHistory ? T.historyClose : (T.historyChip + ' · ' + savedChecks.length)}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* LAGNA MATCH MAP — interactive 12-sign explorer (incl. same-lagna).
            Hidden while the saved list is open so the list sits right under
            the header instead of far below this tall card. */}
        {myLagnaId && !collapsed && !showHistory ? (
          <LagnaExplorerCard
            myLagnaId={myLagnaId}
            language={language}
            userName={(user && user.displayName) ? user.displayName.split(' ')[0] : ''}
          />
        ) : null}

        {/* ── SAVED HISTORY — verdict-first rows, confirm-to-delete ── */}
        {showHistory && savedChecks.length > 0 && !collapsed && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={[ns.shell, { marginBottom: 14 }]}>
              <LinearGradient
                colors={['rgba(20,12,28,0.55)', 'rgba(10,6,16,0.50)']}
                style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              />
              <View style={ns.shellHead}>
                <View style={{ flex: 1 }}>
                  <Text style={ns.shellTitle}>{T.history}</Text>
                  <Text style={ns.shellSub}>{T.historySub}</Text>
                </View>
                <ScoreChip text={String(savedChecks.length)} />
              </View>
              {loadingCheck ? (
                <View style={sty.reportLoadRow}>
                  <CosmicLoader size={20} color="#FF8C00" />
                  <Text style={sty.reportLoadText}>{T.historyLoading}</Text>
                </View>
              ) : null}
              {/* No nested ScrollView — rows flow into the page scroll, so the
                  last row is never clipped mid-text. */}
              <View>
                {savedChecks.map(function(entry, idx) {
                  var score = entry.isServerRecord ? (entry.score || 0) : ((entry.data && entry.data.totalScore) || 0);
                  var max = entry.isServerRecord ? (entry.maxScore || 20) : ((entry.data && entry.data.maxPossibleScore) || 20);
                  var pct = entry.isServerRecord && entry.percentage
                    ? entry.percentage
                    : (max > 0 ? Math.round(score / max * 100) : null);
                  var verdict = getVerdictPhrase({ percentage: pct, totalScore: score, maxPossibleScore: max }, language === 'si');
                  var names = (entry.brideName || T.bride) + (language === 'si' ? ' සහ ' : ' & ') + (entry.groomName || T.groom);
                  var dateLabel = entry.savedAt ? new Date(entry.savedAt).toLocaleDateString() : '';
                  return (
                    <Animated.View key={entry.id} entering={FadeInDown.delay(Math.min(idx, 6) * 50).duration(300)}>
                      <TouchableOpacity
                        style={[ns.histRow, idx === 0 ? { borderTopWidth: 0 } : null, loadingCheck ? { opacity: 0.5 } : null]}
                        onPress={function() { loadSavedCheck(entry); }} activeOpacity={0.7} disabled={loadingCheck}>
                        <View style={[ns.histRing, { borderColor: verdict.color + '55', backgroundColor: verdict.color + '10' }]}>
                          <Ionicons name="heart" size={16} color={verdict.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={ns.histNames} numberOfLines={1}>{names}</Text>
                          <Text style={[ns.histVerdict, { color: verdict.color }]}>{verdict.text}</Text>
                          <Text style={ns.histMeta}>{T.tradCount} {score}/{max}{dateLabel ? '  ·  ' + dateLabel : ''}</Text>
                        </View>
                        <TouchableOpacity
                          style={ns.histDelete}
                          onPress={function(e) {
                            if (e && e.stopPropagation) e.stopPropagation();
                            Alert.alert(T.deleteTitle, T.deleteMsg, [
                              { text: T.deleteCancel, style: 'cancel' },
                              { text: T.deleteConfirm, style: 'destructive', onPress: function() { deleteSavedCheck(entry.id); } },
                            ]);
                          }}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <Ionicons name="trash-outline" size={15} color="rgba(248,113,113,0.55)" />
                        </TouchableOpacity>
                        <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.25)" />
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </View>
            </View>
          </Animated.View>
        )}

        {!collapsed && !showHistory && (
          <View>
            {validationItems.length > 0 ? (
              <Animated.View entering={FadeInDown.duration(250)}>
                <Glass style={sty.validationSummary}>
                  <Ionicons name="alert-circle-outline" size={18} color="#FCA5A5" />
                  <View style={{ flex: 1 }}>
                    <Text style={sty.validationTitle}>{language === 'si' ? 'කරුණාකර මේ විස්තර සම්පූර්ණ කරන්න' : 'Complete these details'}</Text>
                    <Text style={sty.validationText}>{validationItems.join(' ')}</Text>
                  </View>
                </Glass>
              </Animated.View>
            ) : null}
            <TrustStrip T={T} />
            <View style={WIDE ? sty.formRow : undefined}>
              <Animated.View entering={FadeInDown.delay(100).duration(600)} exiting={FadeOut.duration(300)} style={WIDE ? sty.formCol : undefined}>
                <PersonCard label={T.bride} name={bName} setName={setBName}
                  dateStr={bDate} setDateStr={setBDate} timeStr={bTime} setTimeStr={setBTime}
                  city={bCity} setCity={setBCity}
                  T={T} lang={language} fieldPrefix="bride" errors={fieldErrors} clearFieldError={clearFieldError} />
              </Animated.View>
              <Animated.View entering={FadeInDown.delay(180).duration(600)} exiting={FadeOut.duration(300)} style={WIDE ? sty.formCol : undefined}>
                <PersonCard label={T.groom} name={gName} setName={setGName}
                  dateStr={gDate} setDateStr={setGDate} timeStr={gTime} setTimeStr={setGTime}
                  city={gCity} setCity={setGCity}
                  T={T} lang={language} fieldPrefix="groom" errors={fieldErrors} clearFieldError={clearFieldError} />
              </Animated.View>
            </View>
            <Text style={sty.timeHint}>{T.timeHint}</Text>

            {/* Language Selector */}
            <Animated.View entering={FadeInDown.delay(220).duration(600)}>
              <Glass style={{ marginBottom: 14 }}>
                <Text style={{ color: 'rgba(255,140,0,0.7)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
                  {T.langTitle}
                </Text>
                <View style={sty.langRow}>
                  <TouchableOpacity style={[sty.langChip, reportLang === 'si' && sty.langChipActive]} onPress={function() { setReportLang('si'); }} activeOpacity={0.7}>
                    <Ionicons name="globe" size={16} color="#FF8C00" style={{ marginRight: 6 }} />
                    <Text style={[sty.langChipText, reportLang === 'si' && sty.langChipTextActive]}>{T.si}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[sty.langChip, reportLang === 'en' && sty.langChipActive]} onPress={function() { setReportLang('en'); }} activeOpacity={0.7}>
                    <Ionicons name="globe-outline" size={16} color="#60A5FA" style={{ marginRight: 6 }} />
                    <Text style={[sty.langChipText, reportLang === 'en' && sty.langChipTextActive]}>{T.en}</Text>
                  </TouchableOpacity>
                </View>
              </Glass>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(250).duration(600)}>
              <SpringPressable style={sty.cta} onPress={check} disabled={loading} haptic="heavy" scalePressed={0.93}>
                <LinearGradient colors={['#FF8C00', '#FF6D00', '#E65100']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                <LinearGradient colors={['rgba(255,255,255,0.20)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%', borderTopLeftRadius: 16, borderTopRightRadius: 16 }} />
                {loading ? <CosmicLoader size={28} color="#fff" /> : <Text style={sty.ctaText}>{T.checkBtn}</Text>}
              </SpringPressable>
              <Text style={ns.ctaNote}>{T.ctaNote}</Text>
              <View style={ns.privacyRow}>
                <Ionicons name="lock-closed-outline" size={11} color="rgba(255,241,208,0.34)" />
                <Text style={ns.privacyText}>{T.privacyNote}</Text>
              </View>
            </Animated.View>
          </View>
        )}

        {error && <Glass><Text style={sty.errorText}>{error}</Text></Glass>}

        <View style={{ height: isDesktop ? 32 : 120 }} />
        </View>
      </ScrollView>

    </View>
    </KeyboardAvoidingView>
    {teaseData ? (
      <PorondamTeaseOverlay
        tease={teaseData}
        language={language}
        onClose={function () { resolveTease(false); }}
        onProceed={function () { resolveTease(true); }}
      />
    ) : null}
    </DesktopScreenWrapper>
  );
}

// ======= STYLES =======
var sty = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: WIDE ? 32 : 16,
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
  },
  scrollDesktop: { paddingTop: 24, paddingHorizontal: 0 },
  // Inner centring wrapper — applied on desktop inside the scroll
  scrollInner: { width: '100%' },
  scrollInnerDesktop: { maxWidth: 960, alignSelf: 'center', paddingHorizontal: 32 },
  title: {
    fontSize: WIDE ? 36 : 30, fontWeight: '900', color: '#FFF1D0', letterSpacing: -0.5,
    ...textShadow('rgba(255,184,0,0.35)', { width: 0, height: 2 }, 10),
  },
  subtitle: { fontSize: 14, color: 'rgba(255,184,0,0.65)', marginBottom: 24, fontWeight: '500', letterSpacing: 0.3 },

  glass: {
    borderRadius: 20, overflow: 'hidden', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: WIDE ? 24 : 16, marginBottom: 14,
  },

  formRow: { flexDirection: 'row', gap: 14 },
  formCol: { flex: 1 },
  personCard: { paddingBottom: WIDE ? 20 : 14 },
  personLabel: { fontSize: 16, fontWeight: '800', color: '#FFE8B0', marginBottom: 14, letterSpacing: 0.3 },
  nameInput: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    color: '#FFF1D0', fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,140,0,0.2)', marginBottom: 12,
  },
  inputError: { borderColor: 'rgba(248,113,113,0.75)', backgroundColor: 'rgba(127,29,29,0.14)' },
  inlineError: { color: '#FCA5A5', fontSize: 11.5, lineHeight: 16, fontWeight: '700', marginBottom: 12 },
  validationSummary: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderColor: 'rgba(248,113,113,0.24)', backgroundColor: 'rgba(127,29,29,0.10)', marginBottom: 14 },
  validationTitle: { color: '#FECACA', fontSize: 12.5, lineHeight: 17, fontWeight: '900', marginBottom: 2 },
  validationText: { color: 'rgba(254,202,202,0.78)', fontSize: 11.5, lineHeight: 17, fontWeight: '600' },
  fieldTag: { fontSize: 10, fontWeight: '700', color: 'rgba(255,140,0,0.7)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6, marginTop: 4 },
  timeHint: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 16, fontStyle: 'italic', textAlign: 'center' },

  cta: { borderRadius: 16, paddingVertical: 17, alignItems: 'center', overflow: 'hidden', marginBottom: 8, ...boxShadow('#FF8C00', { width: 0, height: 4 }, 0.7, 18) },
  ctaText: { color: '#FFF1D0', fontWeight: '800', fontSize: 16, letterSpacing: 0.8 },

  resultBack: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 12, marginBottom: 6 },
  resultBackText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },
  errorText: { color: '#F87171', fontSize: 14, textAlign: 'center' },

  // Score Gauge — binary star orbit
  shareChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12,
    backgroundColor: 'rgba(255,140,0,0.08)', borderWidth: 1.5, borderColor: 'rgba(255,140,0,0.35)',
  },
  shareChipText: { color: '#FF8C00', fontSize: 12, fontWeight: '800' },

  charts: { marginBottom: 6 },
  chartsWide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  chartCol: { flex: 1, maxWidth: 440 },
  chartCard: { alignItems: 'center', paddingVertical: WIDE ? 20 : 16 },
  chartTitle: { fontSize: 14, fontWeight: '700', color: '#FF8C00', marginBottom: 12, letterSpacing: 0.3 },
  chartSubLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.68)', marginBottom: 8, textAlign: 'center', letterSpacing: 0.2 },
  chartDivider: { width: '70%', height: 1, backgroundColor: 'rgba(255,140,0,0.16)', alignSelf: 'center', marginVertical: 16 },
  heartBridge: { alignItems: 'center', marginVertical: -6, zIndex: 10 },
  heartBridgeWide: { marginVertical: 0, marginHorizontal: -10 },

  langRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  langChip: {
    flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)',
  },
  langChipActive: { borderColor: '#C026D3', backgroundColor: 'rgba(192,38,211,0.15)' },
  langChipText: { color: 'rgba(255,255,255,0.62)', fontSize: 14, fontWeight: '700' },
  langChipTextActive: { color: '#E879F9' },
  reportLoadRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', paddingVertical: 20 },
  reportLoadText: { color: '#FF8C00', fontSize: 13 },

  // ─── Premium UI Styles ───────────────────────────────────────────

  chartsToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, marginVertical: 8,
    borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.12)', backgroundColor: 'rgba(255,140,0,0.04)',
  },
  chartsToggleIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(255,140,0,0.10)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,140,0,0.18)' },
  chartsToggleText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700' },

  // ─── Star Profiles ───
  profilePill: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 14, alignItems: 'center', gap: 4 },
  profileDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  profileName: { fontSize: 12, fontWeight: '800', color: '#FFE8B0', marginBottom: 2 },
  profileSign: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  profileStar: { fontSize: 11, color: 'rgba(255,255,255,0.68)', marginTop: 2 },
  profileLord: { fontSize: 10, color: 'rgba(255,140,0,0.6)', marginTop: 4 },

  // ─── Attraction Chemistry pills ───

  // ─── Deeper Connection rows ───
  deepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  deepLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  deepIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  deepTitle: { fontSize: 13, fontWeight: '700', color: '#FFE8B0' },
  deepDesc: { fontSize: 11, color: 'rgba(255,255,255,0.62)', marginTop: 2, lineHeight: 15 },
  deepBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, marginLeft: 8 },
  deepBadgeText: { fontSize: 11, fontWeight: '900' },

  // ─── Elements card ───
  elemCard: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  elemCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  elemName: { fontSize: 15, fontWeight: '900' },
  elemWho: { fontSize: 10, color: 'rgba(255,255,255,0.62)', fontWeight: '600' },
  elemMetaphor: { fontSize: 12, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 14, fontStyle: 'italic', lineHeight: 18, paddingHorizontal: 8 },

  // ─── Magnetism 5-factor ───
  magRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  magIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  magLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  magBarBg: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  magBarFill: { height: 5, borderRadius: 3 },
  magScore: { fontSize: 11, fontWeight: '900', minWidth: 28, textAlign: 'right' },

  // ─── Soul Blueprint ───
  soulRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  soulIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  soulWho: { fontSize: 11, color: 'rgba(255,255,255,0.62)', fontWeight: '700' },
  soulDrive: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 2 },
  soulPlanet: { fontSize: 10, fontWeight: '900', opacity: 0.7 },

  // ─── Past Lives ───
  pastCard: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: 'rgba(192,132,252,0.04)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(192,132,252,0.12)' },
  pastIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  pastWho: { fontSize: 10, color: 'rgba(255,255,255,0.62)', fontWeight: '700' },
  pastArch: { fontSize: 14, fontWeight: '900' },
  pastNarrative: { fontSize: 12, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 14, fontStyle: 'italic', lineHeight: 18 },

  // ─── Red Flag ───

  // ─── Timing & Pressure ───

  // ─── Intimate Chemistry ───
  // ─── Intimate Chemistry (redesigned) ───
  intimAnimalsSection: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  intimAnimalCardNew: { flex: 1, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden', position: 'relative' },
  intimAnimalGrad: { position: 'absolute', top: 0, left: 0, right: 0, height: 50, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  intimAnimalBubble: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  intimAnimalDesc: { fontSize: 10, color: 'rgba(255,255,255,0.62)', textAlign: 'center', marginTop: 3, lineHeight: 13 },
  intimMatchCenter: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  intimMatchRing: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)' },
  intimNarrativeBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: 'rgba(255,184,0,0.04)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.10)' },
  intimNarrativeText: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', lineHeight: 17 },
});
