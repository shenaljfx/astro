import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, RefreshControl, TouchableOpacity,
  StyleSheet, Dimensions, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, interpolate } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import DesktopScreenWrapper, { useDesktopCtx } from '../../components/DesktopScreenWrapper';
import SriLankanChart from '../../components/SriLankanChart';
import SpringPressable from '../../components/effects/SpringPressable';
import CosmicLoader from '../../components/effects/CosmicLoader';
import PinchableView from '../../components/effects/PinchableView';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { screenColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { boxShadow, textShadow } from '../../utils/shadow';
import useScreenInsets from '../../hooks/useScreenInsets';
import useReducedMotion from '../../hooks/useReducedMotion';
import useLowEndDevice from '../../hooks/useLowEndDevice';
import { CosmicBackground } from '../../components/CosmicBackground';

const CHART_CACHE_KEY = '@grahachara_chart_cache';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const RASHI_SI = {
  1: 'මේෂ', 2: 'වෘෂභ', 3: 'මිථුන', 4: 'කටක',
  5: 'සිංහ', 6: 'කන්‍යා', 7: 'තුලා', 8: 'වෘශ්චික',
  9: 'ධනු', 10: 'මකර', 11: 'කුම්භ', 12: 'මීන'
};

const RASHI_EN = {
  1: 'Aries', 2: 'Taurus', 3: 'Gemini', 4: 'Cancer',
  5: 'Leo', 6: 'Virgo', 7: 'Libra', 8: 'Scorpio',
  9: 'Sagittarius', 10: 'Capricorn', 11: 'Aquarius', 12: 'Pisces'
};

const TITHI_SI = {
  'Pratipada': 'ප්‍රතිපදා', 'Dwitiya': 'ද්විතීයා', 'Tritiya': 'තෘතීයා',
  'Chaturthi': 'චතුර්ථී', 'Panchami': 'පංචමී', 'Shashthi': 'ෂෂ්ඨී',
  'Saptami': 'සප්තමී', 'Ashtami': 'අෂ්ටමී', 'Navami': 'නවමී',
  'Dashami': 'දශමී', 'Ekadashi': 'ඒකාදශී', 'Dwadashi': 'ද්වාදශී',
  'Trayodashi': 'ත්‍රයෝදශී', 'Chaturdashi': 'චතුර්දශී', 'Purnima/Amavasya': 'පුර්ණිමා/අමාවාසි'
};

const PLANET_INFO = {
  'Sun':     { si: 'රවි', en: 'Su', color: '#FFB800' },
  'Moon':    { si: 'චන්ද්‍ර', en: 'Mo', color: '#c7d2fe' },
  'Mars':    { si: 'කුජ', en: 'Ma', color: '#f87171' },
  'Mercury': { si: 'බුධ', en: 'Me', color: '#6ee7b7' },
  'Jupiter': { si: 'ගුරු', en: 'Ju', color: '#FFB800' },
  'Venus':   { si: 'සිකුරු', en: 'Ve', color: '#f9a8d4' },
  'Saturn':  { si: 'ශනි', en: 'Sa', color: '#a5b4fc' },
  'Rahu':    { si: 'රාහු', en: 'Ra', color: '#94a3b8' },
  'Ketu':    { si: 'කේතු', en: 'Ke', color: '#c4b5fd' },
  'Lagna':   { si: 'ලග්න', en: 'Lg', color: '#eab308' },
  'Ascendant':{ si: 'ලග්න', en: 'Lg', color: '#eab308' },
  'Surya':   { si: 'රවි', en: 'Su', color: '#FFB800' },
  'Chandra': { si: 'චන්ද්‍ර', en: 'Mo', color: '#c7d2fe' },
  'Mangala': { si: 'කුජ', en: 'Ma', color: '#f87171' },
  'Budha':   { si: 'බුධ', en: 'Me', color: '#6ee7b7' },
  'Guru':    { si: 'ගුරු', en: 'Ju', color: '#FFB800' },
  'Shukra':  { si: 'සිකුරු', en: 'Ve', color: '#f9a8d4' },
  'Shani':   { si: 'ශනි', en: 'Sa', color: '#a5b4fc' },
};

function formatDegree(deg) {
  if (deg == null || isNaN(deg)) return '';
  const d = Math.floor(deg);
  const m = Math.round((deg - d) * 60);
  return String(d).padStart(2, '0') + '\u00B0' + String(m).padStart(2, '0');
}

function formatBirthTime(isoOrObj) {
  if (!isoOrObj) return '--:--';
  if (typeof isoOrObj === 'object' && isoOrObj.display) return isoOrObj.display;
  // Extract time directly from ISO string to avoid timezone conversion issues
  var str = String(isoOrObj);
  var tMatch = str.match(/T(\d{2}):(\d{2})/);
  if (tMatch) {
    var h = parseInt(tMatch[1], 10);
    var m = tMatch[2];
    var ampm = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12 || 12;
    return String(h12).padStart(2, '0') + ':' + m + ' ' + ampm;
  }
  // Fallback: try parsing as Date but extract UTC values (birth times are stored without TZ offset)
  var d = new Date(isoOrObj);
  if (isNaN(d.getTime())) return '--:--';
  var hh = d.getUTCHours();
  var mm = d.getUTCMinutes();
  var ap = hh >= 12 ? 'PM' : 'AM';
  var h12f = hh % 12 || 12;
  return String(h12f).padStart(2, '0') + ':' + String(mm).padStart(2, '0') + ' ' + ap;
}

// ── Chart Glow Aura wrapper ──────────────────────────────────────────
function ChartGlowAura({ lagnaColor, children }) {
  var glow = useSharedValue(0.5);
  useEffect(function () {
    glow.value = withRepeat(withSequence(withTiming(1, { duration: 3200 }), withTiming(0.5, { duration: 3200 })), -1);
  }, []);
  var glowStyle = useAnimatedStyle(function () { return { opacity: glow.value }; });
  var color = lagnaColor || '#9333EA';
  return (
    <View style={{ alignItems: 'center', marginBottom: 20 }}>
      <Animated.View style={[StyleSheet.absoluteFill, glowStyle, { alignItems: 'center', justifyContent: 'center' }]}>
        <View style={{
          width: SCREEN_WIDTH * 0.82, height: SCREEN_WIDTH * 0.82, borderRadius: SCREEN_WIDTH * 0.41,
          backgroundColor: color + '18',
          ...boxShadow(color, { width: 0, height: 0 }, 0.6, 40),
        }} />
      </Animated.View>
      <View style={{
        borderRadius: 16, overflow: 'hidden', padding: 3,
        borderWidth: 1, borderColor: color + '40',
        ...boxShadow(color, { width: 0, height: 0 }, 0.3, 18), elevation: 8,
      }}>
        <LinearGradient
          colors={[color + '22', 'rgba(10,5,25,0.9)', color + '10']}
          style={{ padding: 2, borderRadius: 14 }}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          {children}
        </LinearGradient>
      </View>
    </View>
  );
}

// ── Yoga Badge pill ──────────────────────────────────────────────────
function YogaBadge({ name, category, language }) {
  var catColor = category === 'Raja Yoga' ? '#FF8C00' : category === 'Dhana Yoga' ? '#FFB800' : category?.includes('Dosha') ? '#F87171' : '#60A5FA';
  var copy = getKendaraStrengthCopy({ name: name, category: category }, language);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: catColor + '50', backgroundColor: catColor + '12', marginRight: 6, marginBottom: 6 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: catColor, marginRight: 5 }} />
      <Text style={{ color: catColor, fontSize: 11, fontWeight: '700' }}>{copy.label}</Text>
    </View>
  );
}

function getKendaraEntryName(entry) {
  if (!entry) return '';
  if (typeof entry === 'string') return entry;
  return entry.english || entry.name || entry.type || '';
}

function getKendaraBirthFocus(entry, language) {
  var name = getKendaraEntryName(entry);
  var map = {
    Ashwini: ['Quick starter energy', 'වැඩක් ඉක්මනින් පටන්ගන්න පුළුවන් ශක්තිය'], Bharani: ['Patient builder energy', 'ඉවසීමෙන් දේවල් ගොඩනගන ගුණයක්'],
    Krittika: ['Sharp decision sense', 'හරි වැරදි ඉක්මනින් තේරුම්ගන්න පුළුවන් හැකියාව'], Rohini: ['Comfort and growth focus', 'සැනසීම, ලස්සන, සහ දියුණුවට ලොකු සහායක්'],
    Mrigashira: ['Curious searching mind', 'නිතර අලුත් දෙයක් හොයන කුතුහලයක්'], Ardra: ['Reset after pressure', 'කලබලයකින් පස්සේ නැවත නැගීසිටින්න පුළුවන් ශක්තියක්'],
    Punarvasu: ['Fresh start after setbacks', 'වැටිලා ඉන්න තැනකින් අලුත් පියවරක් ගන්න පුළුවන් හැකියාව'], Pushya: ['Caring and protective nature', 'අනිත් අයව රැකබලාගන්න, සහාය දෙන්න කැමති හිතක්'],
    Ashlesha: ['Strong emotional boundaries', 'හැඟීම් ගැඹුරින් දැනෙන නිසා සීමාවන් පනවාගන්න එක හොඳයි'], Magha: ['Pride in roots and family', 'පවුල, මුල්, සහ ගෞරවය ගැන ලොකු හැඟීමක්'],
    'Purva Phalguni': ['Warm connection style', 'ආදරය, විවේකය, සහ බැඳීම් වලට හිත හොඳයි'], 'Uttara Phalguni': ['Reliable commitment style', 'කිසියම් වගකීමක් ගත්තොත් ඒක හොඳින් ඉටුකරන ගුණයක්'],
    Hasta: ['Practical hands-on skill', 'තමන්ගේම අතින් වැඩක් කරලා සාර්ථක කරගන්න පුළුවන් හැකියාව'], Chitra: ['Creative builder mind', 'පිළිවෙළට සහ ලස්සනට දේවල් නිර්මාණය කරන්න කැමති හිතක්'],
    Swati: ['Independent movement', 'නිදහසට සහ තමන්ගේම විලාසයකට වැඩ කරන්න තියෙන ගුණයක්'], Vishakha: ['Goal-focused drive', 'ඉලක්කයක් තියාගෙන එකදිගට උත්සාහ කරන්න තියෙන ශක්තිය'],
    Anuradha: ['Loyal friendship energy', 'විශ්වාසවන්ත බැඳීම් සැමදා රකින හිතක්'], Jyeshtha: ['Mature protective wisdom', 'වගකීම සහ අත්දැකීම් එක්ක හැදෙන නායකත්ව ගුණයක්'],
    Mula: ['Root-cause seeker', 'දේවල් වල මුල හොයාගන්න කැමති ගැඹුරින් හිතන හිතක්'], 'Purva Ashadha': ['Confident emotional force', 'තමන් විශ්වාස කරන දේ වෙනුවෙන් පෙනී සිටින්න පුළුවන් ශක්තියක්'],
    'Uttara Ashadha': ['Steady long-term success', 'දිගු කාලයක් ඉවසලා ජයගන්න පුළුවන් ගුණයක්'], Shravana: ['Good listener and learner', 'අහලා, ඉගෙනගෙන දේවල් හොඳට තේරුම්ගන්න පුළුවන් හැකියාව'],
    Dhanishtha: ['Rhythm and teamwork', 'රිද්මය, කණ්ඩායම, සහ දියුණුවට තියෙන හොඳ ගුණයක්'], Shatabhisha: ['Healing and problem solving', 'ගැටලු විසඳලා අනිත් අයව සුවපත් කරන්න තියෙන හැකියාව'],
    'Purva Bhadrapada': ['Deep serious thinking', 'ගැඹුරින් හිතන, කලබල තීරණ ගන්නේ නැති ගුණයක්'], 'Uttara Bhadrapada': ['Calm emotional depth', 'නිහඬව ගැඹුරු දේවල් දරාගන්න පුළුවන් හැකියාව'], Revati: ['Gentle finishing energy', 'මෘදු විදිහට දේවල් ඉවර කරලා අලුත් පියවරකට යන ගුණයක්'],
  };
  var selected = map[name];
  if (!selected) return language === 'si' ? 'ඔයාගේ උපන් නැකතෙන් පෙන්වන මූලික ගුණය' : 'Your birth focus and natural style';
  return language === 'si' ? selected[1] : selected[0];
}

function getKendaraMoonRhythm(name, language) {
  var map = {
    Pratipada: ['Fresh start rhythm', 'අලුත් වැඩක් පටන්ගන්න හොඳම වෙලාවක්'], Dvitiya: ['Slow building rhythm', 'දේවල් හිමින් හිමින් ගොඩනගන්න හොඳම වෙලාවක්'], Tritiya: ['Learning by action', 'කරලා බලලා ඉගෙනගන්න හොඳම රිද්මයක්'], Chaturthi: ['Clear the pressure', 'හිතේ බර අඩු කරගෙන අලුත් වැඩක් සැලසුම් කරන්න හොඳ කාලයක්'],
    Panchami: ['Growth and creativity', 'නිර්මාණශීලී වැඩ වලට සහ ඉදිරියට යන්න හොඳම වෙලාවක්'], Shashthi: ['Service and discipline', 'වගකීමෙන් වැඩ කරලා හොඳ ප්‍රතිඵල ගන්න ලේසි කාලයක්'], Saptami: ['Visible progress', 'හොඳ දියුණුවක් ලබන්න ලේසි වෙන චන්ද්‍ර රිද්මයක්'], Ashtami: ['Move carefully', 'කලබල නොවී පරිස්සමෙන් පියවර තබන්න කියන රිද්මයක්'],
    Navami: ['Focused effort', 'එක ඉලක්කයකට විතරක් හිත යොමු කරන්න හොඳම වෙලාවක්'], Dashami: ['Public results', 'ඔයා කරපු වැඩ වල ප්‍රතිඵල අනිත් අයට පෙන්වන්න හොඳම කාලයක්'], Ekadashi: ['Clear focus', 'හිත සන්සුන් කරගෙන අවධානය එක තැනක තියාගන්න හොඳම රිද්මයක්'], Dwadashi: ['Balance and recovery', 'වෙහෙස නිවාගෙන නැවතත් ශක්තිය ලබාගන්න හොඳම වෙලාවක්'],
    Trayodashi: ['Finish gently', 'ඉවර කරන්න තියෙන වැඩ සන්සුන්ව නිම කරන්න හොඳම වෙලාවක්'], Chaturdashi: ['Let go and reset', 'අනවශ්‍ය බර අතහැරලා අලුත් වෙන්න කියන රිද්මයක්'], Purnima: ['Full moon clarity', 'හිතට හොඳ පැහැදිලි බවක් සහ ශක්තියක් දැනෙන රිද්මයක්'], Amavasya: ['Quiet reset', 'නිහඬව විවේක අරගෙන හිත නැවත හැඩගස්වාගන්න හොඳම කාලයක්'],
  };
  var selected = map[name];
  if (!selected) return language === 'si' ? 'අද සඳු පෙන්වන හිතේ රිද්මය' : 'The emotional rhythm shown by the Moon';
  return language === 'si' ? selected[1] : selected[0];
}

function getKendaraRashiKey(sign) {
  if (!sign) return '';
  if (typeof sign === 'object') {
    if (sign.rashiId || sign.id || sign.rashi) return getKendaraRashiKey(sign.rashiId || sign.id || sign.rashi);
    return getKendaraRashiKey(sign.english || sign.name || sign.rashiName || sign.sinhala);
  }
  var raw = String(sign).trim();
  var num = parseInt(raw, 10);
  if (!isNaN(num) && RASHI_EN[num]) return RASHI_EN[num].toLowerCase();
  var key = raw.toLowerCase();
  var siMap = {
    'මේෂ': 'aries', 'වෘෂභ': 'taurus', 'මිථුන': 'gemini', 'කටක': 'cancer',
    'සිංහ': 'leo', 'කන්‍යා': 'virgo', 'තුලා': 'libra', 'වෘශ්චික': 'scorpio',
    'ධනු': 'sagittarius', 'මකර': 'capricorn', 'කුම්භ': 'aquarius', 'මීන': 'pisces',
  };
  if (siMap[raw]) return siMap[raw];
  var enNames = Object.values(RASHI_EN);
  for (var i = 0; i < enNames.length; i++) {
    if (key.indexOf(enNames[i].toLowerCase()) !== -1) return enNames[i].toLowerCase();
  }
  return key;
}

function getKendaraRashiName(sign, language) {
  var key = getKendaraRashiKey(sign);
  var names = {
    aries: ['Aries', 'මේෂ'], taurus: ['Taurus', 'වෘෂභ'], gemini: ['Gemini', 'මිථුන'], cancer: ['Cancer', 'කටක'],
    leo: ['Leo', 'සිංහ'], virgo: ['Virgo', 'කන්‍යා'], libra: ['Libra', 'තුලා'], scorpio: ['Scorpio', 'වෘශ්චික'],
    sagittarius: ['Sagittarius', 'ධනු'], capricorn: ['Capricorn', 'මකර'], aquarius: ['Aquarius', 'කුම්භ'], pisces: ['Pisces', 'මීන'],
  };
  var selected = names[key];
  if (!selected) return sign ? String(sign) : '--';
  return language === 'si' ? selected[1] : selected[0];
}

function getKendaraLifeStyle(sign, language) {
  var key = getKendaraRashiKey(sign);
  var signName = getKendaraRashiName(sign, language);
  var meanings = {
    aries: ['new starts, courage, quick action', 'අලුත් ආරම්භ, ධෛර්යය, ඉක්මන් ක්‍රියා'],
    taurus: ['money, comfort, patience, steady growth', 'මුදල්, සැනසීම, ඉවසීම, ස්ථිර වර්ධනය'],
    gemini: ['ideas, talking, learning, movement', 'අදහස්, කතාබහ, ඉගෙනීම, ගමන් බිමන්'],
    cancer: ['home, feelings, protection, family bonds', 'නිවස, හැඟීම්, ආරක්ෂාව, පවුලේ බැඳීම්'],
    leo: ['confidence, leadership, visibility, pride', 'ආත්ම විශ්වාසය, නායකත්වය, පෙනීසිටීම'],
    virgo: ['work habits, health, details, service', 'වැඩ පුරුදු, සෞඛ්‍යය, විස්තර, සේවය'],
    libra: ['relationships, fairness, beauty, balance', 'සබඳතා, සාධාරණකම, ලස්සන, සමබරතාව'],
    scorpio: ['deep feelings, privacy, change, healing', 'ගැඹුරු හැඟීම්, පෞද්ගලිකත්වය, වෙනස්වීම්'],
    sagittarius: ['study, travel, faith, big goals', 'ඉගෙනීම, දුර ගමන්, විශ්වාසය, ලොකු අරමුණු'],
    capricorn: ['career, discipline, responsibility, status', 'රැකියාව, විනය, වගකීම්, සමාජ තත්ත්වය'],
    aquarius: ['friends, networks, technology, fresh ideas', 'මිතුරන්, සමාජ ජාල, තාක්ෂණය, නව අදහස්'],
    pisces: ['intuition, kindness, art, inner peace', 'ඉව, කරුණාව, කලාව, අභ්‍යන්තර සැනසීම'],
  };
  var selected = meanings[key];
  if (!selected) return language === 'si' ? 'මේ රාශි පිහිටීම ගැන තොරතුරු සලකා බලමින්' : 'This sign placement is being prepared';
  if (language === 'si') {
    return signName + ' රාශිය - ' + selected[1];
  }
  return signName + ' sign - ' + selected[0];
}

function getKendaraCoreEnergy(planet, language) {
  var key = String(planet || '').toLowerCase();
  var alias = { surya: 'sun', chandra: 'moon', mangala: 'mars', budha: 'mercury', guru: 'jupiter', shukra: 'venus', shani: 'saturn', ascendant: 'lagna' };
  key = alias[key] || key;
  var map = {
    sun: ['Sun - confidence and identity', 'රවි - ආත්ම විශ්වාසය සහ පෞරුෂය'], moon: ['Moon - feelings and comfort', 'සඳු - හැඟීම් සහ සැනසීම'], mars: ['Mars - courage and action', 'කුජ - ධෛර්යය සහ ක්‍රියාශීලී බව'], mercury: ['Mercury - speech and learning', 'බුධ - කතාබහ සහ ඉගෙනීම'],
    jupiter: ['Jupiter - wisdom and support', 'ගුරු - දැනුම සහ ආශීර්වාදය'], venus: ['Venus - love and taste', 'සිකුරු - ආදරය සහ රසවින්දනය'], saturn: ['Saturn - duty and patience', 'ශනි - වගකීම සහ ඉවසීම'], rahu: ['Rahu - ambition and growth', 'රාහු - ආශාව සහ වර්ධන පාඩම'], ketu: ['Ketu - release and inner peace', 'කේතු - අත්හැරීම සහ අභ්‍යන්තර සැනසීම'], lagna: ['Ascendant - life direction', 'ලග්නය - ජීවිත දිශාව'],
  };
  var selected = map[key];
  if (!selected) return language === 'si' ? 'මේ ග්‍රහ ශක්තිය' : 'This planet energy';
  return language === 'si' ? selected[1] : selected[0];
}

function getKendaraPlanetKey(planet) {
  var key = String(planet || '').toLowerCase();
  var alias = { surya: 'sun', chandra: 'moon', mangala: 'mars', budha: 'mercury', guru: 'jupiter', shukra: 'venus', shani: 'saturn', ascendant: 'lagna' };
  return alias[key] || key;
}

function getKendaraPlanetName(planet, language) {
  var key = getKendaraPlanetKey(planet);
  var names = {
    sun: 'Sun', moon: 'Moon', mars: 'Mars', mercury: 'Mercury', jupiter: 'Jupiter', venus: 'Venus', saturn: 'Saturn', rahu: 'Rahu', ketu: 'Ketu', lagna: 'Lagna'
  };
  var canonical = names[key] || planet;
  var info = PLANET_INFO[canonical] || PLANET_INFO[planet];
  return language === 'si' ? ((info && info.si) || String(planet || '--')) : String(canonical || planet || '--');
}

function getKendaraPlanetFocus(planet, language) {
  var key = getKendaraPlanetKey(planet);
  var map = {
    sun: ['confidence, identity, decisions, and visibility', 'විශ්වාසය, තමන්ව පෙන්වන විදිහ, තීරණ'],
    moon: ['feelings, comfort, family rhythm, and emotional safety', 'හිත, හැඟීම්, සැනසීම, පවුලේ රිද්මය'],
    mars: ['courage, speed, conflict handling, and physical drive', 'ධෛර්යය, වේගය, ක්‍රියාශීලී බව, කෝපය පාලනය'],
    mercury: ['speech, learning, business sense, and quick thinking', 'කතාබහ, ඉගෙනීම, ව්‍යාපාරික අදහස්, ඉක්මන් හිතීම'],
    jupiter: ['growth, guidance, belief, teachers, and opportunity', 'දියුණුව, හොඳ උපදෙස්, විශ්වාසය, අවස්ථා'],
    venus: ['love, comfort, taste, money enjoyment, and attraction', 'ආදරය, සැනසීම, රසවින්දනය, ආකර්ෂණය'],
    saturn: ['discipline, delay, duty, patience, and long-term results', 'වගකීම, ඉවසීම, ප්‍රමාද හරහා ලැබෙන දිගුකාලීන ප්‍රතිඵල'],
    rahu: ['ambition, unusual growth, risk-taking, and new experiences', 'ආශාව, අලුත් අත්දැකීම්, වෙනස් මාර්ග වලින් දියුණුව'],
    ketu: ['release, inner peace, past skills, and spiritual distance', 'අතහැරීම, අභ්‍යන්තර සැනසීම, පුරුදු හැකියාවන්'],
    lagna: ['life direction, body, first impression, and personal style', 'ජීවිත දිශාව, පෙනුම, තමන්ගේ හැසිරීම'],
  };
  var selected = map[key];
  if (!selected) return language === 'si' ? 'මේ ග්‍රහ ශක්තිය' : 'this planet energy';
  return language === 'si' ? selected[1] : selected[0];
}

function getKendaraHouseNumber(rashiId, lagnaRashiId) {
  var rashiNum = parseInt(rashiId, 10);
  var lagnaNum = parseInt(lagnaRashiId, 10);
  if (!rashiNum || !lagnaNum) return null;
  return ((rashiNum - lagnaNum + 12) % 12) + 1;
}

function getKendaraOrdinal(num) {
  var n = parseInt(num, 10);
  var suffix = 'th';
  if (n % 100 < 11 || n % 100 > 13) {
    if (n % 10 === 1) suffix = 'st';
    else if (n % 10 === 2) suffix = 'nd';
    else if (n % 10 === 3) suffix = 'rd';
  }
  return n + suffix;
}

function getKendaraHouseLabel(houseNum, language) {
  if (!houseNum) return '';
  return language === 'si' ? houseNum + 'වැනි භාවය' : 'your ' + getKendaraOrdinal(houseNum) + ' house';
}

function getKendaraHouseArea(houseNum, language) {
  var map = {
    1: ['self, body, confidence, and first impression', 'තමන්ගේ පෙනුම, ශරීරය, විශ්වාසය, පළමු හැඟීම'],
    2: ['money, family, speech, food, and saved resources', 'මුදල්, පවුල, කතා කරන වචන, ඉතිරි කරන දේවල්'],
    3: ['communication, courage, siblings, short travel, and effort', 'කතාබහ, ධෛර්යය, සහෝදර සම්බන්ධතා, උත්සාහය'],
    4: ['home, mother, land, vehicles, and emotional comfort', 'නිවස, අම්මා, ඉඩම්, වාහන, හිතේ සැනසීම'],
    5: ['education, creativity, children, romance, and smart choices', 'ඉගෙනීම, නිර්මාණශීලී වැඩ, දරුවන්, ආදර හැඟීම්'],
    6: ['work routine, health habits, service, debts, and competition', 'වැඩ පුරුදු, සෞඛ්‍ය පුරුදු, සේවය, තරඟය'],
    7: ['marriage, partners, clients, agreements, and public dealings', 'විවාහය, හවුල්කරුවන්, ගිවිසුම්, ජනතාව එක්ක වැඩ'],
    8: ['deep change, secrets, shared money, recovery, and research', 'ගැඹුරු වෙනස්කම්, රහස්, හවුල් මුදල්, සුවවීම'],
    9: ['higher learning, luck, teachers, faith, and long travel', 'උසස් ඉගෙනීම, වාසනාව, ගුරුවරු, විශ්වාසය, දුර ගමන්'],
    10: ['career, reputation, authority, goals, and public success', 'රැකියාව, නම, වගකීම, ඉලක්ක, මහජන සාර්ථකත්වය'],
    11: ['friends, networks, income, supporters, and big dreams', 'මිතුරන්, ජාලය, ආදායම, සහායකයන්, ලොකු බලාපොරොත්තු'],
    12: ['rest, foreign links, private life, release, and spiritual space', 'විවේකය, විදේශ සම්බන්ධතා, පෞද්ගලික ජීවිතය, අතහැරීම'],
  };
  var selected = map[houseNum];
  if (!selected) return language === 'si' ? 'ජීවිතයේ ඒ පැත්ත' : 'that life area';
  return language === 'si' ? selected[1] : selected[0];
}

function getKendaraDegreeStage(degree, language) {
  if (degree == null || isNaN(degree)) return '';
  var degreeNum = Number(degree);
  if (degreeNum < 10) {
    return language === 'si'
      ? 'රාශියේ මුල් කොටසේ තියෙන නිසා, මේ ශක්තිය වැඩක් පටන්ගන්න වෙලාවට ඉක්මනින් මතුවෙන්න පුළුවන්.'
      : 'Because it sits in the early part of the sign, this energy tends to show up quickly when something begins.';
  }
  if (degreeNum < 20) {
    return language === 'si'
      ? 'රාශියේ මැද කොටස නිසා, මේ ශක්තිය ස්ථාවරව වැඩ කරලා ප්‍රතිඵල ගන්න උදව් කරනවා.'
      : 'Because it sits in the middle of the sign, this energy tends to work steadily and produce usable results.';
  }
  return language === 'si'
    ? 'රාශියේ අවසාන කොටස නිසා, මේ ශක්තිය අත්දැකීම් එක්ක පරිණත වෙලා පෙන්වෙනවා.'
    : 'Because it sits in the later part of the sign, this energy tends to mature through experience.';
}

function getKendaraShadbalaForPlanet(shadbala, planet) {
  if (!shadbala) return null;
  var key = getKendaraPlanetKey(planet);
  if (shadbala[key]) return shadbala[key];
  var values = Object.values(shadbala);
  for (var index = 0; index < values.length; index++) {
    if (getKendaraPlanetKey(values[index] && values[index].name) === key) return values[index];
  }
  return null;
}

function getKendaraStrengthSentence(strength, language) {
  if (!strength) return '';
  var percent = Number(strength.percentage || 0);
  if (language === 'si') {
    if (percent >= 75) return 'මේ ග්‍රහයාගේ බලය ඉතා ශක්තිමත් නිසා, ඒ පැත්තෙන් අවස්ථා ලැබුණාම ඉක්මනින් ප්‍රතිඵල දෙන්න පුළුවන්.';
    if (percent >= 60) return 'මේ ග්‍රහයා හොඳ සහායක් දෙන නිසා, ඒ පැත්තේ වැඩ කරද්දී විශ්වාසයෙන් යන්න පුළුවන්.';
    if (percent >= 45) return 'මේ ග්‍රහයා මධ්‍යම බලයකින් තියෙන නිසා, සැලසුම් කරලා ගියොත් හොඳ ප්‍රතිඵල ගන්න පුළුවන්.';
    return 'මේ ග්‍රහයාට වැඩි අවධානයක් ඕන නිසා, ඉක්මන් තීරණ වලට වඩා ඉවසීමෙන් යන එක හොඳයි.';
  }
  if (percent >= 75) return 'This planet is very strong in your chart, so opportunities in this area can produce results quickly.';
  if (percent >= 60) return 'This planet gives solid support in your chart, so you can lean into this area with confidence.';
  if (percent >= 45) return 'This planet has moderate support, so planning and consistency help it deliver better results.';
  return 'This planet needs extra attention, so patience and careful choices matter more than rushing.';
}

function getKendaraStrongestShadbalaPart(components, language) {
  if (!components) return language === 'si'
    ? { label: 'සමස්ත බලය', meaning: 'මේ ග්‍රහයා සමස්තයෙන් කොච්චර සහාය දෙනවද කියන එක' }
    : { label: 'overall strength', meaning: 'how strongly this planet can support you overall' };
  var labels = language === 'si'
    ? {
      sthanaBala: { label: 'පිහිටීමේ බලය', meaning: 'ඉන්න තැන නිසා ලැබෙන සහාය' },
      digBala: { label: 'දිශා බලය', meaning: 'ජීවිතයේ නිවැරදි දිශාවට යන්න දෙන සහාය' },
      kalaBala: { label: 'කාල බලය', meaning: 'උපන් වෙලාවේ රිද්මයෙන් ලැබෙන සහාය' },
      cheshtaBala: { label: 'ක්‍රියා බලය', meaning: 'උත්සාහයෙන් ප්‍රතිඵල ගන්න දෙන සහාය' },
      naisargikaBala: { label: 'ස්වභාවික බලය', meaning: 'ග්‍රහයාගේ ස්වභාවික ශක්තියෙන් ලැබෙන සහාය' },
      drigBala: { label: 'සම්බන්ධ බලය', meaning: 'අනිත් ග්‍රහ සම්බන්ධතා වලින් ලැබෙන සහාය' },
    }
    : {
      sthanaBala: { label: 'placement strength', meaning: 'support from where the planet sits' },
      digBala: { label: 'directional strength', meaning: 'support for moving in the right direction' },
      kalaBala: { label: 'timing strength', meaning: 'support from the birth-time rhythm' },
      cheshtaBala: { label: 'effort strength', meaning: 'support for turning effort into results' },
      naisargikaBala: { label: 'natural strength', meaning: 'support from the planet’s own natural power' },
      drigBala: { label: 'connection strength', meaning: 'support from other planetary links' },
    };
  var bestKey = '';
  var bestValue = -999;
  Object.keys(components).forEach(function(componentKey) {
    var value = Number(components[componentKey] || 0);
    if (value > bestValue) {
      bestValue = value;
      bestKey = componentKey;
    }
  });
  return labels[bestKey] || (language === 'si'
    ? { label: 'සමස්ත බලය', meaning: 'මේ ග්‍රහයා සමස්තයෙන් කොච්චර සහාය දෙනවද කියන එක' }
    : { label: 'overall strength', meaning: 'how strongly this planet can support you overall' });
}

function getKendaraPlanetPlacementDetail(planet, rashiLabel, houseNumber, language, shadbala) {
  var planetName = getKendaraPlanetName(planet && planet.name, language);
  var signName = getKendaraRashiName(rashiLabel, language);
  var houseLabel = getKendaraHouseLabel(houseNumber, language);
  var houseArea = getKendaraHouseArea(houseNumber, language);
  var focus = getKendaraPlanetFocus(planet && planet.name, language);
  var degreeNote = getKendaraDegreeStage(planet && planet.degree, language);
  var strengthNote = getKendaraStrengthSentence(getKendaraShadbalaForPlanet(shadbala, planet && planet.name), language);
  if (language === 'si') {
    var siPlace = houseLabel ? signName + ' රාශියේ ' + houseLabel : signName + ' රාශියේ';
    return planetName + ' ' + siPlace + ' තියෙන නිසා, ' + focus + ' ' + houseArea + ' පැත්තෙන් වැඩියෙන් පෙන්වෙනවා. ' + degreeNote + (strengthNote ? ' ' + strengthNote : '');
  }
  var enPlace = houseLabel ? signName + ' in ' + houseLabel : signName;
  return planetName + ' sits in ' + enPlace + ', so ' + focus + ' tends to work through ' + houseArea + '. ' + degreeNote + (strengthNote ? ' ' + strengthNote : '');
}

function getKendaraShadbalaPersonalDetail(strength, language) {
  var planetName = getKendaraPlanetName(strength && strength.name, language);
  var percent = Number(strength && strength.percentage || 0);
  var signName = strength && strength.rashi ? getKendaraRashiName(strength.rashi, language) : '';
  var houseLabel = getKendaraHouseLabel(strength && strength.house, language);
  var houseArea = getKendaraHouseArea(strength && strength.house, language);
  var focus = getKendaraPlanetFocus(strength && strength.name, language);
  var strongestPart = getKendaraStrongestShadbalaPart(strength && strength.components, language);
  if (language === 'si') {
    var siWhere = houseLabel ? houseLabel + ' (' + houseArea + ')' : (signName ? signName + ' රාශිය' : 'ඔයාගේ කේන්දරේ');
    return planetName + ' ' + percent + '% බලයෙන් තියෙන නිසා, ' + focus + ' ' + siWhere + ' පැත්තෙන් ක්‍රියාත්මක වෙනවා. වැඩියෙන්ම සහාය දෙන්නේ ' + strongestPart.label + ' - ' + strongestPart.meaning + '.';
  }
  var enWhere = houseLabel ? houseLabel + ' (' + houseArea + ')' : (signName ? signName + ' sign' : 'your chart');
  return planetName + ' is at ' + percent + '%, so ' + focus + ' is expressed through ' + enWhere + '. The strongest support comes from ' + strongestPart.label + ' - ' + strongestPart.meaning + '.';
}

function getKendaraBhriguPersonalDetail(point, language) {
  if (!point) return '';
  var rashiName = getKendaraRashiName(point.rashi || point.rashiName || point.sinhala, language);
  var degreeValue = point.degreeInSign != null ? Number(point.degreeInSign) : (Number(point.degree || 0) % 30);
  var degreeText = isNaN(degreeValue) ? '' : degreeValue.toFixed(1) + '°';
  var lifeStyle = getKendaraLifeStyle(point.rashi || point.rashiName || point.sinhala, language);
  var birthFocus = getKendaraBirthFocus({ english: point.nakshatra, name: point.nakshatra }, language);
  var activations = point.currentActivations || [];
  if (language === 'si') {
    var activeText = activations.length > 0
      ? 'මේ දවස්වල ' + activations.map(function(item) { return getKendaraPlanetName(item.planet, language); }).join(', ') + ' මේ ලක්ෂ්‍යය අවදි කරන නිසා, අවස්ථා ඉක්මනින් දැනෙන්න පුළුවන්.'
      : 'මේක දිනපතා හදිසි දෙයක් නෙවෙයි; දිගුකාලීනව ඔයා දියුණු වෙන දිශාවක් විදිහට බලන්න.';
    return 'ඔයාගේ දෛවයේ ප්‍රධාන තැන ' + rashiName + ' රාශියේ ' + degreeText + ' වටේ තියෙනවා. ඒ නිසා ' + lifeStyle + ' කියන පැත්තෙන් අවස්ථා විවෘත වෙනවා. නැකත් ගුණය ලෙස ' + birthFocus + ' එකතු වෙනවා. ' + activeText;
  }
  var enActiveText = activations.length > 0
    ? 'Right now ' + activations.map(function(item) { return getKendaraPlanetName(item.planet, language); }).join(', ') + ' is activating this point, so opportunities may feel more immediate.'
    : 'This is not a daily emergency point; read it as a long-term growth direction in your chart.';
  return 'Your destiny point falls around ' + degreeText + ' in ' + rashiName + '. That means opportunities open through ' + lifeStyle + '. Its birth-focus quality adds ' + birthFocus + '. ' + enActiveText;
}

function getKendaraPlanetList(planets, language) {
  if (!planets || planets.length === 0) return language === 'si' ? 'ග්‍රහයන් නැහැ' : 'no planets';
  return planets.map(function(planet) { return getKendaraPlanetName(planet, language); }).join(', ');
}

function getKendaraKetuPatternDetail(pastLife, language) {
  var data = pastLife && pastLife.pastLife;
  if (!data) return '';
  var theme = data.ketuThemes || {};
  var houseLabel = getKendaraHouseLabel(data.ketuHouse, language);
  var rashiName = data.ketuRashi ? getKendaraRashiName(data.ketuRashi, language) : '';
  var domain = language === 'si' ? (theme.domainSi || theme.domain || '') : (theme.domain || '');
  var archetype = language === 'si' ? (theme.archetypeSi || theme.archetype || '') : (theme.archetype || '');
  if (language === 'si') {
    return 'කේතු ' + houseLabel + (rashiName ? ' / ' + rashiName + ' රාශියේ' : '') + ' තියෙන නිසා, ' + domain + ' පැත්ත ඔයාට පුරුදු වගේ දැනෙන්න පුළුවන්. ' + (archetype ? archetype + ' වගේ රටාවක් පරණ පුරුද්දක් ලෙස එන්න පුළුවන්. ' : '') + 'ඒකටම අල්ලාගෙන ඉන්නවාට වඩා, ඒ අත්දැකීම දැන් ලේසි උපකාරයක් කරගන්න.';
  }
  return 'Ketu sits in ' + houseLabel + (rashiName ? ' / ' + rashiName : '') + ', so ' + domain + ' can feel familiar or automatic. ' + (archetype ? 'The old pattern looks like ' + archetype + '. ' : '') + 'Use that experience as a tool, without staying stuck in it.';
}

function getKendaraRahuDirectionDetail(pastLife, language) {
  var data = pastLife && pastLife.currentLifeDirection;
  if (!data) return '';
  var theme = data.rahuThemes || {};
  var houseLabel = getKendaraHouseLabel(data.rahuHouse, language);
  var rashiName = data.rahuRashi ? getKendaraRashiName(data.rahuRashi, language) : '';
  var growth = language === 'si' ? (theme.growthSi || theme.growth || '') : (theme.growth || '');
  var challenge = theme.challenge || '';
  if (language === 'si') {
    return 'රාහු ' + houseLabel + (rashiName ? ' / ' + rashiName + ' රාශියේ' : '') + ' තියෙන නිසා, දැන් වැඩි දියුණුව ' + growth + ' පැත්තට යද්දී එනවා. මේ දිශාව මුලදී අලුත් වගේ දැනුණත්, ඔයාගේ කේන්දරේ ඉස්සරහට දියුණුවට යන මාවත මෙතනයි.';
  }
  return 'Rahu sits in ' + houseLabel + (rashiName ? ' / ' + rashiName : '') + ', so current growth comes through ' + growth + '. It may feel less familiar at first' + (challenge ? ' because it pulls you away from ' + challenge : '') + ', but it is the forward path in this chart.';
}

function getKendaraKarmaBalanceDetail(pastLife, language) {
  var balance = pastLife && pastLife.karmaBalance;
  if (!balance) return '';
  var good = Number(balance.good || 0);
  var challenging = Number(balance.challenging || 0);
  if (language === 'si') {
    if (good > challenging) return 'හොඳ සහාය පැත්ත වැඩියි. ඒ නිසා පැරණි පුරුදු හිරවීමක් නොවී, ඒවා දියුණුවට පාවිච්චි කරන්න පුළුවන්.';
    if (challenging > good) return 'අභියෝග පැත්ත වැඩි නිසා, එකම පුරුද්ද නැවත නැවත කරන්නෙ නැතුව අලුත් තීරණ ගන්න ඕන.';
    return 'හොඳ සහ අභියෝග දෙකම සමබරයි. ඒ නිසා අවධානයෙන් තේරීම් ගත්තොත් මේ රටාව හොඳට පාලනය කරගන්න පුළුවන්.';
  }
  if (good > challenging) return 'Supportive patterns are stronger, so old instincts can become useful tools instead of limitations.';
  if (challenging > good) return 'Challenging patterns are stronger, so growth comes from choosing differently instead of repeating the same habit.';
  return 'Support and challenge are balanced, so conscious choices decide how this pattern plays out.';
}

function getKendaraMeritDetail(pastLife, language) {
  var merit = pastLife && pastLife.pastLifeMerit;
  if (!merit) return '';
  var benefics = getKendaraPlanetList(merit.benefics || [], language);
  var malefics = getKendaraPlanetList(merit.malefics || [], language);
  var lordText = merit.lord5 && merit.lord5.name ? getKendaraPlanetName(merit.lord5.name, language) + ' ' + getKendaraHouseLabel(merit.lord5.house, language) : '';
  if (language === 'si') {
    if (merit.assessment === 'highly_meritorious') return '5වැනි භාවයේ හොඳ සහායක ග්‍රහයන් (' + benefics + ') වැඩියෙන් තියෙන නිසා, ඉගෙනීම, නිර්මාණශීලී වැඩ, හොඳ තේරීම් ස්වභාවිකව සහාය දෙනවා.';
    if (merit.assessment === 'karmic_debts') return '5වැනි භාවයේ වැඩි අවධානයක් ඕන ග්‍රහයන් (' + malefics + ') තියෙන නිසා, ඉක්මන් ප්‍රතිචාර වලට වඩා ඉගෙනගෙන යන රටාව හොඳයි.';
    return '5වැනි භාවයේ සහායත් අභියෝගත් දෙකම මිශ්‍රයි. ' + (lordText ? lordText + ' නිසා මේ ගුණය කාලයත් එක්ක වැඩියෙන් පැහැදිලි වෙනවා.' : 'එක පැත්තකටම නොයන සමබර රටාවක් තියෙනවා.');
  }
  if (merit.assessment === 'highly_meritorious') return 'Supportive planets in the 5th house (' + benefics + ') make learning, creativity, and wise choices come more naturally.';
  if (merit.assessment === 'karmic_debts') return 'More demanding planets in the 5th house (' + malefics + ') ask for patience, learning, and careful emotional choices.';
  return 'The 5th house is mixed, so natural gifts and growth lessons are both present. ' + (lordText ? lordText + ' shows where this becomes clearer over time.' : 'Balance matters here.');
}

function getKendaraDashaPlanet(part) {
  if (!part) return '';
  if (typeof part === 'string') return part;
  return part.planet || part.lord || part.name || '';
}

function getKendaraCurrentDashaWindow(dasha) {
  if (!dasha) return null;
  var current = dasha.currentMahadasha;
  if (current && typeof current === 'object' && (current.startTime || current.start || current.endTime || current.end)) return current;
  var currentPlanet = getKendaraDashaPlanet(current);
  var now = new Date();
  var periods = dasha.mahadashas || [];
  for (var periodIndex = 0; periodIndex < periods.length; periodIndex++) {
    var period = periods[periodIndex];
    var start = new Date(period.startTime || period.start);
    var end = new Date(period.endTime || period.end);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && now >= start && now <= end) return period;
  }
  for (var matchIndex = 0; matchIndex < periods.length; matchIndex++) {
    if (getKendaraPlanetKey(periods[matchIndex].planet) === getKendaraPlanetKey(currentPlanet)) return periods[matchIndex];
  }
  return current && typeof current === 'object' ? current : null;
}

function getKendaraDashaRemainingText(period, language) {
  if (!period) return '';
  var end = new Date(period.endTime || period.end);
  if (isNaN(end.getTime())) return '';
  var diffMs = end - new Date();
  if (diffMs <= 0) return language === 'si' ? 'මේ කාලය අවසන් වෙන්න ආසන්නයි.' : 'This period is close to completion.';
  var months = Math.round(diffMs / (30.44 * 24 * 60 * 60 * 1000));
  if (language === 'si') {
    if (months >= 18) return (months / 12).toFixed(1) + ' අවුරුදු වගේ ඉතිරියි, ඒ නිසා මේක දිගුකාලීන සැලසුම් වලට බලපානවා.';
    return months + ' මාස වගේ ඉතිරියි, ඒ නිසා මේ බලපෑම දැනටමත් දෛනික තීරණ වලට ලඟින් දැනෙන්න පුළුවන්.';
  }
  if (months >= 18) return 'About ' + (months / 12).toFixed(1) + ' years remain, so this affects long-term planning.';
  return 'About ' + months + ' months remain, so this influence may feel close to daily decisions.';
}

function getKendaraDashaPersonalNote(dasha, language, shadbala) {
  if (!dasha || !dasha.currentMahadasha) return '';
  var currentWindow = getKendaraCurrentDashaWindow(dasha);
  var mainPlanet = getKendaraDashaPlanet(currentWindow) || getKendaraDashaPlanet(dasha.currentMahadasha);
  var subPlanet = getKendaraDashaPlanet(dasha.currentAntardasha);
  var mainName = getKendaraPlanetName(mainPlanet, language);
  var subName = subPlanet ? getKendaraPlanetName(subPlanet, language) : '';
  var mainFocus = getKendaraPlanetFocus(mainPlanet, language);
  var subFocus = subPlanet ? getKendaraPlanetFocus(subPlanet, language) : '';
  var strength = getKendaraShadbalaForPlanet(shadbala, mainPlanet);
  var remaining = getKendaraDashaRemainingText(currentWindow, language);
  if (language === 'si') {
    var siStrength = strength ? 'ඔයාගේ කේන්දරේ ' + mainName + ' ' + (strength.percentage || 0) + '% බලයෙන් තියෙන නිසා, මේ කාලයේ ප්‍රතිඵල එන්නේ ඒ බලය අනුවයි.' : '';
    var siSub = subPlanet ? ' ' + subName + ' අතුරු ශක්තිය නිසා ' + subFocus + ' දිනපතා තීරණ වලට එකතු වෙනවා.' : '';
    return mainName + ' කාලය නිසා මේ අදියරේ ' + mainFocus + ' වැඩියෙන් ඉස්සරහට එනවා.' + siSub + ' ' + siStrength + ' ' + remaining;
  }
  var enStrength = strength ? 'In your chart ' + mainName + ' has ' + (strength.percentage || 0) + '% support, so results come through that level of strength.' : '';
  var enSub = subPlanet ? ' The ' + subName + ' sub-period adds ' + subFocus + ' to everyday decisions.' : '';
  return 'Because this is a ' + mainName + ' period, ' + mainFocus + ' becomes the main life theme now.' + enSub + ' ' + enStrength + ' ' + remaining;
}

function getKendaraStrengthCopy(item, language) {
  var category = String(item && item.category || '').toLowerCase();
  if (language === 'si') {
    if (category.indexOf('viparita') !== -1) return { label: 'අභියෝගය ජයගන්න ශක්තියක්', desc: 'අමාරු තැනකින් නැවත නැගිටලා, අත්දැකීම් ශක්තියක් කරගන්න පුළුවන් පිහිටීමක්.' };
    if (category.indexOf('raja') !== -1) return { label: 'නායකත්වයට හොඳ පිහිටීමක්', desc: 'වගකීමක් ගත්තාම ඉදිරියට එන්න, මිනිසුන්ට බලපෑමක් කරන්න හැකි ශක්තියක්.' };
    if (category.indexOf('dhana') !== -1) return { label: 'මුදල් සහ දියුණුවට සහාය', desc: 'උත්සාහය, හොඳ තීරණ, සහ නිවැරදි අවස්ථා එකතු වුණාම ලාභයක් ගන්න පහසු පිහිටීමක්.' };
    if (category.indexOf('dosha') !== -1 || category.indexOf('challenge') !== -1) return { label: 'සැලකිලිමත් විය යුතු පැත්තක්', desc: 'මෙය බය විය යුතු දෙයක් නොවෙයි; තීරණ ගන්න කලින් ටිකක් වැඩිපුර හිතන්න කියන ඉඟියක්.' };
    if (category.indexOf('moon') !== -1) return { label: 'හිත සහ කීර්තියට සහාය', desc: 'මනස, කතාබහ, ජනතාවගේ විශ්වාසය, සහ දිනපතා සබඳතා හරහා සහාය ලැබෙන පිහිටීමක්.' };
    if (category.indexOf('education') !== -1) return { label: 'ඉගෙනීම සහ කලා හැකියාව', desc: 'දැනුම, කතාබහ, නිර්මාණශීලීත්වය, සහ හොඳ තේරුම්ගැනීමට සහාය දෙන පිහිටීමක්.' };
    if (category.indexOf('character') !== -1) return { label: 'විශ්වාසය දිනාගන්න ගුණයක්', desc: 'හොඳ නමක්, සදාචාරය, සහ මිනිසුන්ගේ විශ්වාසය තබාගන්න උදව් වෙන පිහිටීමක්.' };
    if (category.indexOf('personality') !== -1 || category.indexOf('panch') !== -1) return { label: 'පෞරුෂයට විශේෂ සහාය', desc: 'තමන්ගේ හැඩරුව, හැසිරීම, ආකර්ෂණය, සහ ඉදිරිපත් වීමේ ශක්තිය වැඩි කරන පිහිටීමක්.' };
    if (category.indexOf('protection') !== -1 || category.indexOf('benefic') !== -1) return { label: 'ආරක්ෂාව සහ ආශීර්වාදය', desc: 'අමාරු තැන් මෘදු කරලා, හොඳ උපදෙස් සහ සහාය ලැබෙන්න පහසු කරන පිහිටීමක්.' };
    if (category.indexOf('sun') !== -1) return { label: 'කතාබහ සහ පෙනීසිටීමට සහාය', desc: 'වචන වලින්, මතකයෙන්, සහ තමන්ව ඉදිරිපත් කරන හැටියෙන් බලපෑමක් කරන්න උදව් වෙන පිහිටීමක්.' };
    if (category.indexOf('neechabhanga') !== -1) return { label: 'දුර්වලකම ශක්තියට හරවන පිහිටීමක්', desc: 'මුලදී අමාරු වගේ පෙනෙන දෙයක්, කාලයත් එක්ක ශක්තියක් බවට පත් කරන රටාවක්.' };
    return { label: 'ඔයාට උපකාර කරන ස්වභාවික හැකියාවක්', desc: 'දෛනික ජීවිතයේ හොඳ තේරීම් ගන්න සහ ඉදිරියට යන්න සහාය දෙන පිහිටීමක්.' };
  }
  if (category.indexOf('viparita') !== -1) return { label: 'Resilience Support', desc: 'A placement that can turn difficulty into practical strength through persistence.' };
  if (category.indexOf('raja') !== -1) return { label: 'Leadership Support', desc: 'A placement that can help you step forward, take responsibility, and influence others.' };
  if (category.indexOf('dhana') !== -1) return { label: 'Money and Growth Support', desc: 'A placement that can support prosperity when effort and timing come together.' };
  if (category.indexOf('dosha') !== -1 || category.indexOf('challenge') !== -1) return { label: 'Care Point', desc: 'Not something to fear; it simply asks for more awareness before big decisions.' };
  if (category.indexOf('moon') !== -1) return { label: 'Mind and Reputation Support', desc: 'A placement that can support emotional rhythm, public trust, and everyday connection.' };
  if (category.indexOf('education') !== -1) return { label: 'Learning and Creative Support', desc: 'A placement that can support knowledge, speech, creativity, and understanding.' };
  if (category.indexOf('character') !== -1) return { label: 'Trusted Character Support', desc: 'A placement that can support reputation, ethical conduct, and public confidence.' };
  if (category.indexOf('personality') !== -1 || category.indexOf('panch') !== -1) return { label: 'Personality Support', desc: 'A placement that can strengthen presence, charm, and self-expression.' };
  if (category.indexOf('protection') !== -1 || category.indexOf('benefic') !== -1) return { label: 'Protection and Blessing Support', desc: 'A placement that can soften pressure and bring support from good guidance.' };
  if (category.indexOf('sun') !== -1) return { label: 'Speech and Presence Support', desc: 'A placement that can help you influence through words, memory, and presence.' };
  if (category.indexOf('neechabhanga') !== -1) return { label: 'Weakness-to-Strength Support', desc: 'A placement that can turn an early challenge into strength over time.' };
  return { label: 'Natural Strength', desc: 'A supportive pattern that can help you make better choices in real life.' };
}

function getKendaraStrengthCategoryLabel(category, language) {
  var rawCategory = String(category || '');
  var normalized = rawCategory.toLowerCase();
  if (language === 'si') {
    if (normalized.indexOf('viparita') !== -1) return 'විපරීත රාජ යෝගය';
    if (normalized.indexOf('raja') !== -1) return 'රාජ යෝගය';
    if (normalized.indexOf('dhana') !== -1) return 'ධන යෝගය';
    if (normalized.indexOf('dosha') !== -1 || normalized.indexOf('challenge') !== -1) return 'අවධානය දෙන්න ඕන පිහිටීමක්';
    if (normalized.indexOf('moon') !== -1) return 'චන්ද්‍ර යෝගය';
    if (normalized.indexOf('education') !== -1) return 'ඉගෙනීම් යෝගය';
    if (normalized.indexOf('character') !== -1) return 'චරිත සහාය';
    if (normalized.indexOf('personality') !== -1) return 'පෞරුෂ යෝගය';
    if (normalized.indexOf('panch') !== -1) return 'පංච මහාපුරුෂ යෝගය';
    if (normalized.indexOf('protection') !== -1) return 'ආරක්ෂක යෝගය';
    if (normalized.indexOf('benefic') !== -1) return 'ශුභ යෝගය';
    if (normalized.indexOf('sun') !== -1) return 'සූර්ය යෝගය';
    if (normalized.indexOf('neechabhanga') !== -1) return 'නීචභංග යෝගය';
    return 'ස්වභාවික ශක්ති පිහිටීමක්';
  }
  return rawCategory || 'Natural Strength';
}

function getKendaraChallengeCopy(item, language) {
  var severity = item && item.severity ? String(item.severity).toLowerCase() : '';
  if (language === 'si') {
    if (item && item.cancelled) {
      return {
        label: 'මෙය දැන් දැඩි අවදානමක් නොවෙයි',
        desc: 'කේන්දරේ අනිත් සහායක ආකෘති මේ බලපෑම අඩු කරලා තියෙනවා. සාමාන්‍ය විදිහට ඉන්නෙන් ඉස්සරහට යන්න.',
      };
    }
    if (severity.indexOf('severe') !== -1) {
      return {
        label: 'වැදගත්ම තීරණ වලදී දෙවරක් හිතන්න',
        desc: 'හදිසි තීරණ, කෝපයෙන් කතා කිරීම, හෝ බලෙන් වැඩ කරවීමෙන් පීඩනය වැඩි වෙන්න පුළුවන්. ඉවසීමෙන් සහ හොඳ උපදෙස් එක්ක ගියොත් මේක හොඳින් කළමනාකරණය කරගන්න පුළුවන්.',
      };
    }
    if (severity.indexOf('moderate') !== -1) {
      return {
        label: 'කලබල නොවී සැලසුම් කරගෙන යන්න',
        desc: 'මේ පිහිටීම ජීවිතයේ සමහර තැන්වල ප්‍රමාදයක් හරි අමතර වගකීමක් හරි දෙන්න පුළුවන්. වැඩ කලින් සැලසුම් කරලා, හදිසි ප්‍රතිචාර වලින් වැළකෙන්න.',
      };
    }
    return {
      label: 'සාමාන්‍ය විදිහට ඉන්නක් තියාගන්න',
      desc: 'මෙය බය විය යුතු දෙයක් නොවෙයි. දෛනික වැඩ වලදී ඉවසීම, පැහැදිලි කතාබහ, සහ අධික අවදානම් තීරණ වලින් වැළකීම ප්‍රයෝජනවත් වේ.',
    };
  }
  if (item && item.cancelled) {
    return {
      label: 'This is not a major risk now',
      desc: 'Other supportive placements soften this influence. Keep normal awareness and move forward steadily.',
    };
  }
  if (severity.indexOf('severe') !== -1) {
    return {
      label: 'Think twice before major decisions',
      desc: 'Rushed choices, angry conversations, or forcing outcomes can add pressure. Patience and good advice help you manage this well.',
    };
  }
  if (severity.indexOf('moderate') !== -1) {
    return {
      label: 'Plan calmly and avoid rushing',
      desc: 'This placement can bring delay or extra responsibility in some areas. Planning ahead and avoiding reactive decisions will help.',
    };
  }
  return {
    label: 'Keep normal awareness',
    desc: 'This is not something to fear. Patience, clear communication, and avoiding unnecessary risks are enough here.',
  };
}

function getKendaraIssueCopy(item, language) {
  var rawName = String((language === 'si' && item && item.sinhala) || (item && item.name) || '');
  var rawText = [item && item.name, item && item.sinhala, item && item.description, item && item.descriptionSi, item && item.type].filter(Boolean).join(' ').toLowerCase();
  var isSi = language === 'si';
  var issue = isSi
    ? { name: 'කේන්දරේ පෙන්වන සැලකිලිමත් කරුණ', meaning: 'මේ පෙන්වන්නේ ඔයාගේ ජීවිතයේ වැඩිපුර හිතන්න ඕන තැනක්.' }
    : { name: 'Chart care point', meaning: 'This shows a life area that needs extra awareness.' };

  if (/mars|mangal|kuja|අංගහරු|කුජ/.test(rawText)) {
    issue = isSi
      ? { name: 'කුජ බලපෑම - සබඳතා වල තීව්‍රතාව', meaning: 'කුජ පිහිටීම නිසා ආදරය, විවාහය, හෝ සමීප සබඳතා වලදී ඉක්මන් කෝපය, තද ප්‍රතිචාර, හරි අධික බලපෑමක් ඇති වෙන්න පුළුවන්ද කියලා මෙතනින් බලනවා.' }
      : { name: 'Mars influence - relationship intensity', meaning: 'Checks whether Mars can create impatience, strong reactions, or intensity in close relationships.' };
  } else if (/kaal|sarp|කාල සර්ප/.test(rawText)) {
    issue = isSi
      ? { name: 'රාහු-කේතු පීඩනය - හදිසි වෙනස්වීම්', meaning: 'ජීවිතයේ සමහර කාලවල හදිසි ඉහළ-පහළ යාම්, ප්‍රමාද, හෝ පැහැදිලි නැති බාධා වැඩි වෙන්න පුළුවන්ද කියලා මෙතනින් බලනවා.' }
      : { name: 'Rahu-Ketu pressure - sudden changes', meaning: 'Checks whether life may bring sudden ups and downs, delay, or unclear obstacles.' };
  } else if (/saturn.*7\.5|sade|ශනි පැමිණීම/.test(rawText)) {
    issue = isSi
      ? { name: 'සෙනසුරු කාල පීඩනය - වගකීම් සහ ප්‍රමාද', meaning: 'දැනට සෙනසුරු ගමන නිසා වැඩි වගකීම්, මනසට බරක්, හෝ ප්‍රමාදයක් දැනෙන්න පුළුවන්ද කියලා මෙතනින් බලනවා.' }
      : { name: 'Saturn period pressure - responsibility and delay', meaning: 'Checks whether Saturn is currently adding responsibility, pressure, or delay.' };
  } else if (/family heritage|pitru|පිතෘ|පරම්පරා/.test(rawText)) {
    issue = isSi
      ? { name: 'පවුල් රටාව - පියා/මුල් පවුලෙන් එන බලපෑම', meaning: 'පවුලේ පරණ රටා, පියා සම්බන්ධ කරුණු, හෝ වැඩිහිටියන්ගෙන් එන වගකීම් ජීවිත දිශාවට බලපාන විදිහ මෙතනින් බලනවා.' }
      : { name: 'Family pattern - father or roots influence', meaning: 'Checks whether family patterns, father-related matters, or inherited responsibilities affect life direction.' };
  } else if (/solar|සූර්ය/.test(rawText)) {
    issue = isSi
      ? { name: 'රවි සංවේදිතාව - ආත්ම විශ්වාසය සහ අධිකාරීන්', meaning: 'ආත්ම විශ්වාසය, පියා/අධිකාරීන්, සහ නායකත්ව තීරණ වලදී ගොඩක් කල්පනාවෙන් ඉන්නක් ඕනෙද කියලා මෙතනින් බලනවා.' }
      : { name: 'Sun sensitivity - confidence and authority', meaning: 'Checks confidence, father or authority matters, and leadership decisions.' };
  } else if (/lunar|moon|චන්ද්‍ර/.test(rawText) && !/saturn|ශනි/.test(rawText)) {
    issue = isSi
      ? { name: 'සඳු සංවේදිතාව - මනස සහ හැඟීම්', meaning: 'මනස, නිදහස, නින්ද, මව/සැනසීම සම්බන්ධ කරුණු වලදී වැඩි අවධානයක් අවශ්‍යදැයි මෙයින් බලනවා.' }
      : { name: 'Moon sensitivity - mind and emotions', meaning: 'Checks mental peace, sleep, comfort, mother-related matters, and emotional steadiness.' };
  } else if (/moon-saturn|චන්ද්‍ර-ශනි/.test(rawText)) {
    issue = isSi
      ? { name: 'සඳු-ශනි පීඩනය - හැඟීම් දරාගැනීම', meaning: 'හැඟීම් ඇතුළට තබාගැනීම, තනිකම, හෝ මනසට බරක් දැනෙන රටාවක් තිබේදැයි මෙයින් බලනවා.' }
      : { name: 'Moon-Saturn pressure - emotional heaviness', meaning: 'Checks whether emotions are carried quietly, with loneliness, restraint, or mental heaviness.' };
  } else if (/saturn-rahu|ශනි-රාහු/.test(rawText)) {
    issue = isSi
      ? { name: 'ශනි-රාහු පීඩනය - අනපේක්ෂිත බාධා', meaning: 'අනපේක්ෂිත ප්‍රමාද, විස්තර නොපෙනෙන බාධා, සහ දිගටම ඉවසීම ඕනේ තැන් මෙතනින් බලනවා.' }
      : { name: 'Saturn-Rahu pressure - unexpected obstacles', meaning: 'Checks unexpected delays, unclear obstacles, and areas that need steady discipline.' };
  } else if (/jupiter|guru|ගුරු/.test(rawText)) {
    issue = isSi
      ? { name: 'ගුරු බලපෑම - උපදෙස් සහ විශ්වාස තෝරාගැනීම', meaning: 'ගුරු/උපදේශකයින්, විශ්වාස, අධ්‍යාපනය, සහ වැදගත්ම උපදෙස් තෝරාගැනීමේදී පැහැදිලි බව ඕනෙද කියලා මෙතනින් බලනවා.' }
      : { name: 'Jupiter influence - advice and beliefs', meaning: 'Checks clarity around mentors, beliefs, education, and important advice.' };
  } else if (/financial|daridra|මූල්‍ය/.test(rawText)) {
    issue = isSi
      ? { name: 'මුදල් කළමනාකරණ අභියෝගය', meaning: 'ආදායම, වියදම්, ඉතුරුම්, සහ මුදල් තීරණ වලදී වැඩි පිළිවෙළක් ඕනෙද කියලා මෙතනින් බලනවා.' }
      : { name: 'Financial management challenge', meaning: 'Checks whether income, spending, savings, and money decisions need more structure.' };
  }

  issue.technical = rawName || (isSi ? 'නම නොමැති ගණනයක්' : 'Unnamed calculation');
  return issue;
}

function getKendaraCancellationCopy(item, language) {
  var reason = String((item && item.cancellationReason) || (item && item.details && item.details.cancellationReason) || '');
  var rawText = [item && item.name, item && item.sinhala, item && item.description, item && item.descriptionSi, reason].filter(Boolean).join(' ').toLowerCase();
  if (language === 'si') {
    if (/mars|mangal|kuja|අංගහරු|කුජ/.test(rawText)) return 'කුජ තමන්ට ශක්තිමත් රාශියක ඉන්න නිසා හරි ගුරුගේ සහායක දෘෂ්ටිය ලැබීම නිසා, සබඳතා වලට එන කුජ පීඩනය අඩු වෙලා තියෙනවා.';
    if (/moon-saturn|චන්ද්‍ර-ශනි/.test(rawText)) return 'ගුරුගේ සහායක බලපෑම සඳු-ශනි පීඩනය මෘදු කරන නිසා, හැඟීම් සම්බන්ධ අභියෝග කළමනාකරණය කරගන්න පහසුයි.';
    return reason ? cleanKendaraExplanation(reason, language) : 'කේන්දරේ අනිත් හොඳ පිහිටීම් මේ කරුණේ බලපෑම අඩු කරලා තියෙනවා.';
  }
  if (/mars|mangal|kuja/.test(rawText)) return 'Mars is in a stronger position or receives supportive Jupiter influence, so the relationship pressure is reduced.';
  if (/moon-saturn/.test(rawText)) return 'Supportive Jupiter influence softens the Moon-Saturn pressure, making emotional challenges easier to manage.';
  return reason ? cleanKendaraExplanation(reason, language) : 'Other supportive placements reduce the effect of this issue.';
}

function cleanKendaraExplanation(text, language) {
  if (!text) return text;
  var out = String(text);
  var replacements = language === 'si'
    ? [
        [/Nakshatra|නක්ෂත්‍ර/g, 'උපන් නැකතෙන් පෙන්වන ගුණය'], [/Tithi|තිථි/g, 'සඳුගේ රිද්මය'], [/Yoga|Yogas|යෝග/g, 'ශක්ති පිහිටීම්'],
        [/Dosha|Doshas|දෝෂ/g, 'සැලකිලිමත් විය යුතු කරුණු'], [/Navamsha|D9|D-9/g, 'විවාහ සහ අභ්‍යන්තර දැක්ම'], [/Rashi|රාශි/g, 'රාශි පිහිටීම'],
        [/Lagna|ලග්න/g, 'ලග්නය'], [/Dasha|දශා/g, 'ජීවිතයේ කාල අදියර'], [/Atmakaraka/g, 'ප්‍රධාන අභ්‍යන්තර ශක්තිය'], [/Upapada/g, 'කැපවීමේ රටාව'],
        [/Rahu|රාහු/g, 'වර්ධන පාඩම'], [/Ketu|කේතු/g, 'අභ්‍යන්තර නිදහස'], [/planetary positions|planet positions/gi, 'උපන් ශක්ති රටා'],
      ]
    : [
        [/Nakshatra/g, 'Birth Focus'], [/Tithi/g, 'Moon Rhythm'], [/Yoga|Yogas/g, 'Strength Patterns'], [/Dosha|Doshas/g, 'Care Points'],
        [/Navamsha|D9|D-9/g, 'Deep Relationship View'], [/Rashi/g, 'Life Area'], [/Lagna/g, 'Life Direction'], [/Dasha/g, 'Life Period'],
        [/Atmakaraka/g, 'Core Inner Energy'], [/Upapada/g, 'Commitment Style'], [/Rahu/g, 'Growth Lesson'], [/Ketu/g, 'Inner Freedom'],
        [/planetary positions|planet positions/gi, 'birth energy patterns'], [/Vedic astrology/gi, 'this life reading'],
      ];
  replacements.forEach(function(pair) { out = out.replace(pair[0], pair[1]); });
  return out;
}

// ── Varga Chart Async Loader ──────────────────────────────────
function VargaChartDisplay({ division, birthDateTime, lat, lng, language }) {
  var [vargaData, setVargaData] = useState(null);
  var [vargaLoading, setVargaLoading] = useState(false);
  var [vargaError, setVargaError] = useState(null);

  useEffect(function () {
    if (!birthDateTime || !division) return;
    var cancelled = false;
    setVargaLoading(true);
    setVargaError(null);
    api.getJyotishVarga(division, { birthDate: birthDateTime, lat: lat, lng: lng })
      .then(function (res) {
        if (cancelled) return;
        if (res && res.success && res.data) {
          setVargaData(res.data);
        } else {
          setVargaError('No data');
        }
      })
      .catch(function (err) {
        if (!cancelled) setVargaError(err.message || 'Failed');
      })
      .finally(function () {
        if (!cancelled) setVargaLoading(false);
      });
    return function () { cancelled = true; };
  }, [division, birthDateTime, lat, lng]);

  if (vargaLoading) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 24 }}>
        <CosmicLoader size={28} color="#06B6D4" />
      </View>
    );
  }
  if (vargaError || !vargaData) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 16 }}>
        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
          {language === 'si' ? 'විස්තර නැහැ' : 'No data available'}
        </Text>
      </View>
    );
  }

  // Render varga planet table
  var planets = vargaData.planets || {};
  var ascRashiId = vargaData.ascendant?.rashi;
  var ascRashi = language === 'si' && ascRashiId ? RASHI_SI[ascRashiId] : (vargaData.ascendant?.rashiName || '--');

  // Planet meaning in each divisional chart context
  var PLANET_MEANING = {
    d9: {
      Sun:     { si: 'විවාහයේ අධිකාරිය/තත්ත්වය', en: 'Authority & status in marriage' },
      Moon:    { si: 'විවාහයේ හැඟීම්/සහායකත්වය', en: 'Emotional bond in marriage' },
      Mars:    { si: 'විවාහයේ ශක්තිය/ගැටුම්', en: 'Passion & conflicts in marriage' },
      Mercury: { si: 'සන්නිවේදනය/බුද්ධිමත් සම්බන්ධතා', en: 'Communication in relationships' },
      Jupiter: { si: 'විවාහයේ ආශීර්වාදය/සෞභාග්‍යය', en: 'Blessings & fortune in marriage' },
      Venus:   { si: 'ආදරය/ලිංගික සම්බන්ධතා', en: 'Love, romance & attraction' },
      Saturn:  { si: 'විවාහයේ පරීක්ෂණ/කැපවීම', en: 'Tests & commitment in marriage' },
      Rahu:    { si: 'අසාමාන්‍ය සම්බන්ධතා/විදේශීය', en: 'Unconventional or foreign partner' },
      Ketu:    { si: 'අධ්‍යාත්මික බැඳීම්/පසුගිය ජීවිත', en: 'Spiritual bond, past-life karma' },
      Uranus:  { si: 'අනපේක්ෂිත වෙනස්කම්', en: 'Sudden changes in relationships' },
      Neptune: { si: 'පරමාදර්ශී ආදරය', en: 'Idealistic or spiritual love' },
      Pluto:   { si: 'ගැඹුරු පරිවර්තනය', en: 'Deep transformation in bonds' },
    },
    d10: {
      Sun:     { si: 'වෘත්තීය නායකත්වය/අධිකාරිය', en: 'Career leadership & authority' },
      Moon:    { si: 'රැකියාවේ ජනප්‍රියත්වය/මහජනතාව', en: 'Public image & popularity at work' },
      Mars:    { si: 'වෘත්තීය තරඟකාරිත්වය/ශක්තිය', en: 'Career drive & competitiveness' },
      Mercury: { si: 'ව්‍යාපාර/සන්නිවේදන කුසලතා', en: 'Business skills & communication' },
      Jupiter: { si: 'වෘත්තීය සෞභාග්‍යය/උසස්වීම්', en: 'Career growth & promotions' },
      Venus:   { si: 'නිර්මාණාත්මක වෘත්තිය/සුඛෝපභෝගී', en: 'Creative career & luxury fields' },
      Saturn:  { si: 'දිගු කාලීන වෘත්තීය/වෙහෙස', en: 'Long-term career & hard work pays' },
      Rahu:    { si: 'තාක්ෂණය/විදේශ රැකියා', en: 'Technology or foreign career' },
      Ketu:    { si: 'අධ්‍යාත්මික/පර්යේෂණ වෘත්තිය', en: 'Research, spiritual or healing career' },
      Uranus:  { si: 'නවෝත්පාදන/නිදහස් වෘත්තිය', en: 'Innovation & freelance career' },
      Neptune: { si: 'කලා/සිනමා/සේවා වෘත්තිය', en: 'Arts, film or service career' },
      Pluto:   { si: 'බලාධිකාරී/පරිවර්තන වෘත්තිය', en: 'Powerful or transformative career' },
    },
    d7: {
      Sun:     { si: 'දරුවන්ගේ නායක ගුණය', en: 'Children\'s leadership qualities' },
      Moon:    { si: 'දරුවන් සමඟ හැඟීම් බැඳීම', en: 'Emotional bond with children' },
      Mars:    { si: 'දරුවන්ගේ ශක්තිය/ක්‍රීඩා', en: 'Children\'s energy & sports talent' },
      Mercury: { si: 'දරුවන්ගේ බුද්ධිය/ඉගෙනීම', en: 'Children\'s intelligence & learning' },
      Jupiter: { si: 'දරුවන්ගේ ආශීර්වාදය/සංඛ්‍යාව', en: 'Blessings of children & fertility' },
      Venus:   { si: 'දරුවන්ගේ නිර්මාණාත්මකත්වය', en: 'Children\'s creative talents' },
      Saturn:  { si: 'දරු ප්‍රමාදය/වගකීම්', en: 'Delayed children or responsibility' },
      Rahu:    { si: 'අසාමාන්‍ය දරුපලය', en: 'Unusual path to parenthood' },
      Ketu:    { si: 'අධ්‍යාත්මික දරු සම්බන්ධය', en: 'Spiritual bond or fewer children' },
      Uranus:  { si: 'දරුවන්ගේ නිදහස්කාමී ගුණ', en: 'Children\'s independent spirit' },
      Neptune: { si: 'දරුවන්ගේ නිර්මාණ හැකියා', en: 'Children\'s artistic abilities' },
      Pluto:   { si: 'දරුවන් හරහා පරිවර්තනය', en: 'Transformation through children' },
    },
    d4: {
      Sun:     { si: 'දේපළ හරහා තත්ත්වය', en: 'Status through property' },
      Moon:    { si: 'නිවසේ සැනසීම/සුවය', en: 'Comfort & happiness at home' },
      Mars:    { si: 'ඉඩම්/ගොඩනැගිලි', en: 'Land, buildings & real estate' },
      Mercury: { si: 'බහු දේපළ/ව්‍යාපාර', en: 'Multiple properties & business assets' },
      Jupiter: { si: 'දේපළ වාසනාව/උරුමය', en: 'Property fortune & inheritance' },
      Venus:   { si: 'සුඛෝපභෝගී නිවස/වාහන', en: 'Luxury home & vehicles' },
      Saturn:  { si: 'පැරණි දේපළ/ප්‍රමාද ලැබීම', en: 'Old property or delayed acquisition' },
      Rahu:    { si: 'විදේශ දේපළ/අසාමාන්‍ය ආයෝජන', en: 'Foreign property or unusual investments' },
      Ketu:    { si: 'දේපළ අලාභය/විරාගය', en: 'Property detachment or loss' },
    },
    d24: {
      Sun:     { si: 'අධ්‍යාපනයේ නායකත්වය', en: 'Academic leadership & recognition' },
      Moon:    { si: 'ඉගෙනීමේ ආශාව/මතකය', en: 'Learning desire & memory power' },
      Mars:    { si: 'තාක්ෂණික/ඉංජිනේරු අධ්‍යාපනය', en: 'Technical or engineering education' },
      Mercury: { si: 'බහු විෂය දැනුම/භාෂා', en: 'Multi-subject knowledge & languages' },
      Jupiter: { si: 'උසස් අධ්‍යාපනය/ශාස්ත්‍රීය', en: 'Higher education & academic success' },
      Venus:   { si: 'කලා/සංගීත අධ්‍යාපනය', en: 'Arts, music & creative education' },
      Saturn:  { si: 'ප්‍රමාද නමුත් ගැඹුරු ඉගෙනීම', en: 'Delayed but deep, thorough learning' },
      Rahu:    { si: 'විදේශ/නවීන අධ්‍යාපනය', en: 'Foreign or modern/tech education' },
      Ketu:    { si: 'ආධ්‍යාත්මික/පාරම්පරික දැනුම', en: 'Spiritual or traditional knowledge' },
    },
    d20: {
      Sun:     { si: 'ආධ්‍යාත්මික නායකත්වය', en: 'Spiritual leadership' },
      Moon:    { si: 'භක්තිය/භාවනා ශක්තිය', en: 'Devotion & meditation ability' },
      Mars:    { si: 'ක්‍රියාශීලී ආධ්‍යාත්මික පුහුණුව', en: 'Active spiritual practice (yoga, etc.)' },
      Mercury: { si: 'ආගමික ග්‍රන්ථ අධ්‍යයනය', en: 'Study of spiritual texts & philosophy' },
      Jupiter: { si: 'ගුරු ආශීර්වාදය/ප්‍රඥාව', en: 'Guru blessings & wisdom' },
      Venus:   { si: 'භක්ති සංගීතය/ආගමික කලාව', en: 'Devotional music & sacred arts' },
      Saturn:  { si: 'වෙහෙසකර ආධ්‍යාත්මික ගමන', en: 'Difficult but rewarding spiritual path' },
      Rahu:    { si: 'අසාමාන්‍ය ආධ්‍යාත්මික මාර්ග', en: 'Unconventional spiritual paths' },
      Ketu:    { si: 'ස්වාභාවික මෝක්ෂ සම්බන්ධය', en: 'Natural inclination to liberation' },
    },
  };

  var meanings = PLANET_MEANING[division] || {};

  return (
    <View style={{ marginTop: 12 }}>
      <View style={kj.vargaAscRow}>
        <Text style={kj.vargaAscLabel}>{language === 'si' ? 'මේ කොටසේ මූලික දිශාව' : 'Main focus in this chart'}</Text>
        <Text style={kj.vargaAscValue}>{getKendaraLifeStyle(ascRashi, language)}</Text>
      </View>
      {Object.entries(planets).map(function (entry, i) {
        var name = entry[0];
        var p = entry[1];
        if (!p) return null;
        var pInfo = PLANET_INFO[name] || {};
        var pColor = pInfo.color || '#818CF8';
        var rashiStr = language === 'si' && p.rashi ? RASHI_SI[p.rashi] : (p.rashiName || p.rashi || '--');
        var hint = meanings[name];
        var hintText = hint ? cleanKendaraExplanation(language === 'si' ? hint.si : hint.en, language) : null;
        var placementText = getKendaraLifeStyle(rashiStr, language);
        return (
          <View key={i} style={kj.vargaPlanetRow}>
            <View style={kj.vargaPlanetTop}>
              <View style={[kj.chalitDot, { backgroundColor: pColor }]} />
              <View style={{ flex: 1 }}>
                <Text style={[kj.vargaPlanetName, { color: pColor }]}>
                  {getKendaraCoreEnergy(name, language)}
                </Text>
              </View>
              <Text style={kj.vargaPlanetRashi}>{getKendaraRashiName(rashiStr, language)}</Text>
            </View>
            <Text style={kj.vargaPlanetPlacement}>{placementText}</Text>
            {hintText ? (
              <Text style={kj.vargaPlanetHint} numberOfLines={2}>{hintText}</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

// ============================================================
// Main Kendara Screen
// ============================================================

export default function KendaraScreen() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { colors, gradients, resolved } = useTheme();
  const sc = screenColors(colors);
  const router = useRouter();
  var isDesktop = useDesktopCtx();
  var insets = useScreenInsets();
  var reduced = useReducedMotion();
  var lowEnd = useLowEndDevice();

  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [marakaData, setMarakaData] = useState(null);
  const [marakaLoading, setMarakaLoading] = useState(false);
  const [expandedApala, setExpandedApala] = useState(null);
  const [jyotishData, setJyotishData] = useState(null);
  const [jyotishLoading, setJyotishLoading] = useState(false);
  const [selectedVarga, setSelectedVarga] = useState('d9');
  
  const stepTimers = useRef([]);
  const lastFetchedBirth = useRef(null);
  const chartDataRef = useRef(null);
  const fetchingRef = useRef(false);
  const langRef = useRef(language);
  langRef.current = language;

  const birthDateTime = user?.birthData?.dateTime || null;
  const birthLat = user?.birthData?.lat || 6.9271;
  const birthLng = user?.birthData?.lng || 79.8612;
  const hasBirthData = !!birthDateTime;

  const clearStepTimers = useCallback(() => {
    stepTimers.current.forEach(t => clearTimeout(t));
    stepTimers.current = [];
  }, []);

  useEffect(() => {
    if (!hasBirthData) { setChartData(null); chartDataRef.current = null; return; }

    // Already have data for this birth time — skip
    if (chartDataRef.current && lastFetchedBirth.current === birthDateTime) return;

    var cancelled = false;

    (async () => {
      // Try local cache first (instant, no network)
      try {
        var raw = await AsyncStorage.getItem(CHART_CACHE_KEY);
        if (raw) {
          var cached = JSON.parse(raw);
          if (cached && cached.birthDateTime === birthDateTime && cached.data) {
            if (!cancelled) {
              setChartData(cached.data);
              chartDataRef.current = cached.data;
              lastFetchedBirth.current = birthDateTime;
            }
            return;
          }
        }
      } catch (_) { /* ignore cache miss */ }

      // Guard against concurrent fetches
      if (fetchingRef.current) return;
      fetchingRef.current = true;

      try {
        if (!cancelled) {
          setLoading(true);
          setError(null);
          setLoadingStep(1);
        }
        clearStepTimers();

        stepTimers.current.push(setTimeout(() => { if (!cancelled) setLoadingStep(2); }, 150));
        stepTimers.current.push(setTimeout(() => { if (!cancelled) setLoadingStep(3); }, 350));
        stepTimers.current.push(setTimeout(() => { if (!cancelled) setLoadingStep(4); }, 550));

        var res = await api.getBirthChart(birthDateTime, birthLat, birthLng, langRef.current);
        if (cancelled) return;

        clearStepTimers();
        setLoadingStep(5);

        if (res.success) {
          await new Promise(r => setTimeout(r, 400));
          if (cancelled) return;
          setChartData(res.data);
          chartDataRef.current = res.data;
          lastFetchedBirth.current = birthDateTime;
          try {
            await AsyncStorage.setItem(CHART_CACHE_KEY, JSON.stringify({ birthDateTime: birthDateTime, data: res.data, savedAt: Date.now() }));
          } catch (_) { /* ignore */ }
        } else {
          throw new Error(res.error || 'Failed to calculate chart');
        }
      } catch (err) {
        if (cancelled) return;
        if (err && (err.name === 'AbortError' || (err.message && err.message.indexOf('abort') !== -1))) return;
        setError(err.message || 'Failed to load chart');
      } finally {
        fetchingRef.current = false;
        if (!cancelled) {
          setLoading(false);
          setLoadingStep(0);
        }
      }
    })();

    return () => { cancelled = true; clearStepTimers(); };
  }, [hasBirthData, birthDateTime, birthLat, birthLng, clearStepTimers, refreshKey]);

  // Fetch Maraka Apala data when birth data is available
  useEffect(() => {
    if (!hasBirthData || !birthDateTime) { setMarakaData(null); return; }
    var cancelled = false;
    (async () => {
      try {
        setMarakaLoading(true);
        var res = await api.getMarakaApalaFull(birthDateTime, birthLat, birthLng, 5);
        if (cancelled) return;
        if (res.success) {
          setMarakaData(res.data);
        }
      } catch (err) {
        if (!cancelled && __DEV__) console.warn('Maraka Apala fetch error:', err.message);
      } finally {
        if (!cancelled) setMarakaLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [hasBirthData, birthDateTime, birthLat, birthLng, refreshKey]);

  // Fetch Jyotish advanced data (Dasha, Mangal Dosha, Sade Sati, Kundli)
  useEffect(() => {
    if (!hasBirthData || !birthDateTime) { setJyotishData(null); return; }
    var cancelled = false;
    (async () => {
      try {
        setJyotishLoading(true);
        var body = { birthDate: birthDateTime, lat: birthLat, lng: birthLng };
        var [dashaRes, mangalRes, sadeRes, chalitRes] = await Promise.all([
          api.getJyotishDasha(body).catch(function() { return null; }),
          api.getJyotishMangalDosha(body).catch(function() { return null; }),
          api.getJyotishSadeSati(body).catch(function() { return null; }),
          api.getJyotishChalit(body).catch(function() { return null; }),
        ]);
        if (cancelled) return;
        setJyotishData({
          dasha: dashaRes && dashaRes.success ? dashaRes.data : null,
          mangalDosha: mangalRes && mangalRes.success ? mangalRes.data : null,
          sadeSati: sadeRes && sadeRes.success ? sadeRes.data : null,
          chalit: chalitRes && chalitRes.success ? chalitRes.data : null,
        });
      } catch (err) {
        if (!cancelled && __DEV__) console.warn('Jyotish fetch error:', err.message);
      } finally {
        if (!cancelled) setJyotishLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [hasBirthData, birthDateTime, birthLat, birthLng, refreshKey]);

  // Pull-to-refresh: clear caches and force the effect to re-run
  const onRefresh = useCallback(() => {
    if (fetchingRef.current) return;
    lastFetchedBirth.current = null;
    chartDataRef.current = null;
    AsyncStorage.removeItem(CHART_CACHE_KEY).catch(() => {});
    setChartData(null);
    setMarakaData(null);
    setJyotishData(null);
    setExpandedApala(null);
    setError(null);
    setRefreshKey(function (k) { return k + 1; });
  }, []);

  const renderContent = () => {
    if (!hasBirthData) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="planet-outline" size={64} color="rgba(251,191,36,0.5)" />
          <Text style={styles.emptyTitle}>{t('kpBirthNeeded') || 'Birth Details Needed'}</Text>
          <Text style={styles.emptyText}>{t('setBirthDataPrompt') || 'Please set your birth date and time in your profile to see your chart.'}</Text>
          <SpringPressable style={styles.actionButton} onPress={() => router.push('/(tabs)/profile')} haptic="medium">
            <Text style={styles.actionButtonText}>{t('goToProfile') || 'Go to Profile'}</Text>
          </SpringPressable>
        </View>
      );
    }

    if (loading && !chartData) {
      const STEPS = language === 'si' ? [
        { icon: 'globe-outline', text: 'සර්වර් එකට සම්බන්ධ වෙනවා...', key: 1 },
        { icon: 'planet-outline', text: 'ඔයාගේ ග්‍රහ පිහිටීම් කියවනවා...', key: 2 },
        { icon: 'language-outline', text: 'සිංහලට හරවනවා...', key: 3 },
        { icon: 'sparkles-outline', text: 'ජීවිත සිතියම ලෑස්ති කරනවා...', key: 4 },
        { icon: 'checkmark-circle-outline', text: 'ඔක්කොම ලෑස්තියි!', key: 5 },
      ] : [
        { icon: 'globe-outline', text: 'Connecting to server...', key: 1 },
        { icon: 'planet-outline', text: 'Reading birth energies...', key: 2 },
        { icon: 'telescope-outline', text: 'Finding life patterns...', key: 3 },
        { icon: 'sparkles-outline', text: 'Building your life map...', key: 4 },
        { icon: 'checkmark-circle-outline', text: 'Ready!', key: 5 },
      ];
      return (
        <View style={styles.loadingContainer}>
          <Animated.View entering={FadeIn.duration(400)} style={styles.loadingCard}>
            <LinearGradient
              colors={['rgba(50,20,80,0.6)', 'rgba(20,10,40,0.8)']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            />
            <Text style={styles.loadingTitle}>
              {'✦ ' + (t('kpPreparingChart') || 'Preparing Your Life Map') + ' ✦'}
            </Text>
            <View style={styles.stepsContainer}>
              {STEPS.map((step) => {
                const isActive = loadingStep === step.key;
                const isDone = loadingStep > step.key;
                const isPending = loadingStep < step.key;
                return (
                  <Animated.View
                    key={step.key}
                    entering={FadeInDown.delay(step.key * 100).duration(300)}
                    style={[styles.stepRow, isActive && styles.stepRowActive]}
                  >
                    <View style={[styles.stepIconWrap, isDone && styles.stepIconDone, isActive && styles.stepIconActive]}>
                      {isDone ? (
                        <Ionicons name="checkmark" size={16} color="#10b981" />
                      ) : isActive ? (
                        <CosmicLoader size={20} color="#FFB800" />
                      ) : (
                        <Ionicons name={step.icon} size={16} color="rgba(255,255,255,0.3)" />
                      )}
                    </View>
                    <Text style={[
                      styles.stepText,
                      isDone && styles.stepTextDone,
                      isActive && styles.stepTextActive,
                      isPending && styles.stepTextPending,
                    ]}>
                      {step.text}
                    </Text>
                  </Animated.View>
                );
              })}
            </View>
            <View style={styles.loadingBarTrack}>
              <Animated.View style={[styles.loadingBarFill, { width: (loadingStep / 5 * 100) + '%' }]} />
            </View>
          </Animated.View>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <SpringPressable onPress={onRefresh} haptic="light">
            <Text style={{ color: '#FFB800', marginTop: 10 }}>{t('kpRetry') || 'Try Again'}</Text>
          </SpringPressable>
        </View>
      );
    }

    if (!chartData) return null;

    const lagnaRashiId = chartData.lagna ? (chartData.lagna.rashiId || chartData.lagna.id || 1) : 1;

    // Pick a lagna color for glow
    var lagnaColors = ['#9333EA','#EC4899','#F59E0B','#34D399','#60A5FA','#F87171','#A78BFA','#FFB800','#4CC9F0','#34D399','#818CF8','#F472B6'];
    var lagnaGlowColor = lagnaColors[(lagnaRashiId - 1) % lagnaColors.length];

    // Collect top yogas for badges
    var seenYogaBadges = {};
    var topYogas = (chartData.advancedAnalysis?.tier1?.advancedYogas?.items || []).filter(function(y) {
      if (!(y.strength === 'Very Strong' || y.strength === 'Strong')) return false;
      var copy = getKendaraStrengthCopy(y, language);
      var badgeKey = (copy.label || y.category || y.name || '').toLowerCase();
      if (seenYogaBadges[badgeKey]) return false;
      seenYogaBadges[badgeKey] = true;
      return true;
    }).slice(0, 5);

    var summaryNakshatra = (chartData.panchanga && chartData.panchanga.nakshatra) || chartData.nakshatra;
    var summaryTithiName = (chartData.panchanga && chartData.panchanga.tithi && chartData.panchanga.tithi.name) || null;
    var chartSummaryItems = [
      {
        icon: 'compass-outline', color: '#FFB800',
        label: language === 'si' ? 'ලග්නයෙන් කියන දේ' : 'Your rising sign shows',
        value: getKendaraLifeStyle(chartData.lagna && (chartData.lagna.english || chartData.lagna.name || chartData.lagna.rashiId), language),
      },
      {
        icon: 'star-outline', color: '#60A5FA',
        label: language === 'si' ? 'නැකතෙන් කියන දේ' : 'Your birth star suggests',
        value: summaryNakshatra ? getKendaraBirthFocus(summaryNakshatra, language) : '--',
      },
      {
        icon: 'moon-outline', color: '#C7D2FE',
        label: language === 'si' ? 'සඳුගේ හිතේ රිද්මය' : 'Your Moon rhythm feels like',
        value: summaryTithiName ? getKendaraMoonRhythm(summaryTithiName, language) : '--',
      },
      {
        icon: 'heart-outline', color: '#F9A8D4',
        label: language === 'si' ? 'හිතයි හැඟීමුයි වැඩ කරන විදිහ' : 'Your emotional side leans toward',
        value: getKendaraLifeStyle(chartData.moonSign && (chartData.moonSign.english || chartData.moonSign.name || chartData.moonSign.rashiId), language),
      },
      {
        icon: 'sunny-outline', color: '#F59E0B',
        label: language === 'si' ? 'විශ්වාසය පෙන්වන විදිහ' : 'Your confidence expresses through',
        value: getKendaraLifeStyle(chartData.sunSign && (chartData.sunSign.english || chartData.sunSign.name || chartData.sunSign.rashiId), language),
      },
    ];

    return (
      <View style={styles.chartContainer}>
        <View style={styles.headerRow}>
          <Ionicons name="grid-outline" size={20} color="#FFB800" />
          <Text style={styles.sectionTitle}>
            {language === 'si' ? 'ඔයාගේ කේන්දර සිතියම' : 'Your Birth Life Map'}
          </Text>
        </View>

        {/* Yoga badges strip */}
        {topYogas.length > 0 && (
          <Animated.View entering={FadeIn.duration(600)} style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
            {topYogas.map(function (y, i) { return <YogaBadge key={i} name={y.name} category={y.category} language={language} />; })}
          </Animated.View>
        )}

        <PinchableView minScale={1} maxScale={2.5}>
          <ChartGlowAura lagnaColor={lagnaGlowColor}>
            <SriLankanChart
              rashiChart={chartData.rashiChart}
              lagnaRashiId={lagnaRashiId}
              language={language}
            />
          </ChartGlowAura>
        </PinchableView>

        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>{language === 'si' ? 'කේන්දරේ සරලව' : 'Your Chart in Plain Language'}</Text>
          <Text style={styles.cardIntro}>
            {language === 'si'
              ? 'අමාරු වචන නැතුව, මේ ග්‍රහ පිහිටීම් ඔයාගේ ජීවිතයට බලපාන විදිහ මෙතනින් සරලව තේරුම් ගන්න පුළුවන්.'
              : 'A simple read of what the main chart points mean in everyday life.'}
          </Text>
          {chartSummaryItems.map(function (item, i) {
            return (
              <View key={i} style={styles.summaryItem}>
                <View style={[styles.summaryIcon, { borderColor: item.color + '35', backgroundColor: item.color + '10' }]}>
                  <Ionicons name={item.icon} size={15} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                  <Text style={styles.summaryValue}>{item.value}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={[styles.detailsCard, { marginTop: 14 }]}>
          <Text style={styles.cardTitle}>
            {language === 'si' ? 'උපන් වෙලාවේ ග්‍රහ පිහිටීම්' : 'Birth Planet Placements'}
          </Text>
          <Text style={styles.cardIntro}>
            {language === 'si'
              ? 'එක් එක් ග්‍රහයාගෙන් පෙන්වන්නේ ඔයාගේ ජීවිතේ විවිධ ශක්තීන්. ඒ අය ඉන්න රාශිය අනුව ඒ ශක්තිය වැඩ කරන විදිහ වෙනස් වෙනවා.'
              : 'Each planet describes one kind of energy. The sign shows where that energy tends to show up.'}
          </Text>
          {chartData.rashiChart && chartData.rashiChart.map(function(entry) {
            if (!entry.planets || entry.planets.length === 0) return null;
            return entry.planets
              .filter(function(p) { return p.name !== 'Lagna' && p.name !== 'Ascendant'; })
              .map(function(p, idx) {
                var info = PLANET_INFO[p.name];
                var pLabel = getKendaraCoreEnergy(p.name, language);
                var pColor = info ? info.color : '#fff';
                var rashiLabel = language === 'si'
                  ? (RASHI_SI[entry.rashiId] || entry.rashi)
                  : (entry.rashiEnglish || entry.rashi);
                var placement = getKendaraLifeStyle(rashiLabel, language);
                var placementHouse = getKendaraHouseNumber(entry.rashiId, lagnaRashiId);
                var placementDetail = getKendaraPlanetPlacementDetail(p, rashiLabel, placementHouse, language, chartData.advancedAnalysis?.tier2?.shadbala);
                return (
                  <View key={entry.rashiId + '-' + idx} style={styles.planetRow}>
                    <View style={[styles.planetDot, { backgroundColor: pColor }]} />
                    <View style={styles.planetTextWrap}>
                      <View style={styles.planetTopLine}>
                        <Text style={[styles.planetName, { color: pColor }]}>{pLabel}</Text>
                        <Text style={styles.planetDegree}>{formatDegree(p.degree)}</Text>
                      </View>
                      <Text style={styles.planetRashi}>{placement}</Text>
                      <Text style={styles.planetPersonalNote}>{placementDetail}</Text>
                      <View style={styles.planetBarTrack}>
                        <View style={[styles.planetBarFill, { backgroundColor: pColor, width: (30 + ((p.degree != null ? p.degree : 15) / 30) * 60) + '%' }]} />
                      </View>
                    </View>
                  </View>
                );
              });
          })}
        </View>

        {(chartData.navamsaChart || chartData.navamshaChart) ? (
          <View style={{ marginTop: 20 }}>
            <View style={styles.headerRow}>
              <Ionicons name="apps-outline" size={20} color="#FFB800" />
              <Text style={styles.sectionTitle}>
                {t('kpNavamsaChart') || 'Relationship & Inner Self Chart'}
              </Text>
            </View>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <PinchableView minScale={1} maxScale={2.5}>
                <ChartGlowAura lagnaColor="#A78BFA">
                  <SriLankanChart
                    rashiChart={chartData.navamsaChart || chartData.navamshaChart}
                    lagnaRashiId={(chartData.navamshaLagna && chartData.navamshaLagna.rashi && chartData.navamshaLagna.rashi.id) || (chartData.navamsaLagna && chartData.navamsaLagna.rashi && chartData.navamsaLagna.rashi.id) || lagnaRashiId}
                    language={language}
                  />
                </ChartGlowAura>
              </PinchableView>
            </View>
          </View>
        ) : null}

        {/* ═══ ADVANCED ANALYSIS ═══ */}
        {chartData.advancedAnalysis && (
          <View style={{ marginTop: 8 }}>

            {/* ── AI OVERALL SUMMARY ── */}
            {chartData.chartExplanations?.overall && (
              <Animated.View entering={FadeInDown.delay(150).duration(600)}>
                <View style={[styles.advCard, { borderColor: 'rgba(255,140,0,0.25)', marginBottom: 12 }]}>
                  <LinearGradient colors={['rgba(255,140,0,0.12)', 'rgba(255,184,0,0.06)', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                    <Ionicons name="sparkles" size={20} color="#FF8C00" />
                    <Text style={{ color: '#FF8C00', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 }}>
                      {'✨ ' + (t('kpChartAtGlance') || 'Your Chart Summary')}
                    </Text>
                  </View>
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 22, fontStyle: 'italic' }}>
                    {cleanKendaraExplanation(chartData.chartExplanations.overall, language)}
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* ── DOSHAS ── */}
            {chartData.advancedAnalysis.tier1?.doshas?.items?.length > 0 && (
              <Animated.View entering={FadeInDown.delay(200).duration(600)}>
                <View style={styles.headerRow}>
                  <Ionicons name="alert-circle-outline" size={20} color="#f87171" />
                  <Text style={styles.sectionTitle}>
                    {language === 'si' ? 'අවධානය දෙන්න ඕන තැන්' : 'Care Points to Review'}
                  </Text>
                </View>
                <View style={styles.advCard}>
                  {chartData.advancedAnalysis.tier1.doshas.items.map(function(d, i) {
                    var sevColor = d.severity === 'Severe' ? '#ef4444' : d.severity === 'Moderate' ? '#f59e0b' : '#10b981';
                    var sevLabel = language === 'si'
                      ? (d.severity === 'Severe' ? 'ගොඩක් කල්පනාවෙන් ඉන්න' : d.severity === 'Moderate' ? 'ටිකක් අවධානය දෙන්න' : 'සාමාන්‍ය විදිහට ඉන්න')
                      : (d.severity === 'Severe' ? 'Extra Care' : d.severity === 'Moderate' ? 'Moderate Care' : 'Light Care');
                    var challenge = getKendaraChallengeCopy(d, language);
                    var issue = getKendaraIssueCopy(d, language);
                    var cancelCopy = d.cancelled ? getKendaraCancellationCopy(d, language) : null;
                    return (
                      <View key={i} style={styles.doshaRow}>
                        <View style={[styles.doshaDot, { backgroundColor: d.cancelled ? '#6b7280' : sevColor }]} />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                            <Text style={styles.doshaName}>{issue.name}</Text>
                            {d.cancelled ? (
                              <View style={styles.cancelBadge}>
                                <Text style={styles.cancelText}>{language === 'si' ? 'බලපෑම අඩුයි' : 'SOFTENED'}</Text>
                              </View>
                            ) : (
                              <View style={[styles.sevBadge, { backgroundColor: sevColor + '20', borderColor: sevColor + '50' }]}>
                                <Text style={[styles.sevText, { color: sevColor }]}>{sevLabel}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.doshaMeta}>{language === 'si' ? 'කරුණ: ' : 'Calculated issue: '}{issue.technical}</Text>
                          <Text style={styles.doshaIssueMeaning}>{issue.meaning}</Text>
                          <Text style={styles.doshaGuidanceTitle}>{challenge.label}</Text>
                          <Text style={styles.doshaDesc}>{challenge.desc}</Text>
                          {cancelCopy ? (
                            <View style={styles.cancelInfoBox}>
                              <Text style={styles.cancelInfoLabel}>{language === 'si' ? 'බලපෑම අඩු වුණේ ඇයි?' : 'Why it is softened'}</Text>
                              <Text style={styles.cancelInfoText}>{cancelCopy}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </Animated.View>
            )}

            {/* Dosha AI explanation */}
            {chartData.chartExplanations?.doshas && chartData.chartExplanations.doshas !== 'N/A' && (
              <View style={styles.aiExplainBox}>
                <Ionicons name="bulb-outline" size={14} color="#FFB800" />
                <Text style={styles.aiExplainText}>{cleanKendaraExplanation(chartData.chartExplanations.doshas, language)}</Text>
              </View>
            )}

            {/* ── ADVANCED YOGAS ── */}
            {chartData.advancedAnalysis.tier1?.advancedYogas?.items?.length > 0 && (
              <Animated.View entering={FadeInDown.delay(300).duration(600)}>
                <View style={styles.headerRow}>
                  <Ionicons name="star-outline" size={20} color="#FFB800" />
                  <Text style={styles.sectionTitle}>
                    {t('kpYogaTitle') || 'Your Natural Strengths & Talents'}
                  </Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{chartData.advancedAnalysis.tier1.advancedYogas.found}</Text>
                  </View>
                </View>
                <View style={styles.advCard}>
                  {chartData.advancedAnalysis.tier1.advancedYogas.items.map(function(y, i) {
                    var catColor = y.category === 'Raja Yoga' ? '#FF8C00' : y.category === 'Dhana Yoga' ? '#FFB800' : y.category?.includes('Dosha') ? '#f87171' : '#60a5fa';
                    var strColor = y.strength === 'Very Strong' ? '#10b981' : y.strength === 'Strong' ? '#34d399' : '#6b7280';
                    var strLabel = y.strength === 'Very Strong' ? t('kpVeryStrong') : y.strength === 'Strong' ? t('kpStrong') : t('kpModerate');
                    var copy = getKendaraStrengthCopy(y, language);
                    var catLabel = getKendaraStrengthCategoryLabel(y.category, language);
                    return (
                      <View key={i} style={styles.yogaItem}>
                        <View style={styles.yogaTop}>
                          <View style={[styles.catDot, { backgroundColor: catColor }]} />
                          <Text style={styles.yogaName}>{copy.label}</Text>
                          <View style={[styles.strBadge, { borderColor: strColor + '60' }]}>
                            <Text style={[styles.strText, { color: strColor }]}>{strLabel || y.strength}</Text>
                          </View>
                        </View>
                        {catLabel !== copy.label && <Text style={styles.yogaCat}>{catLabel}</Text>}
                        <Text style={styles.yogaDesc}>{copy.desc}</Text>
                      </View>
                    );
                  })}
                </View>
              </Animated.View>
            )}

            {/* Yoga AI explanation */}
            {chartData.chartExplanations?.yogas && chartData.chartExplanations.yogas !== 'N/A' && (
              <View style={styles.aiExplainBox}>
                <Ionicons name="bulb-outline" size={14} color="#FFB800" />
                <Text style={styles.aiExplainText}>{cleanKendaraExplanation(chartData.chartExplanations.yogas, language)}</Text>
              </View>
            )}

            {/* ── JAIMINI KARAKAS ── */}
            {chartData.advancedAnalysis.tier1?.jaimini && (
              <Animated.View entering={FadeInDown.delay(400).duration(600)}>
                <View style={styles.headerRow}>
                  <Ionicons name="compass-outline" size={20} color="#FF8C00" />
                  <Text style={styles.sectionTitle}>
                    {t('kpJaiminiTitle') || 'Your Life Direction'}
                  </Text>
                </View>
                <View style={styles.advCard}>
                  {chartData.advancedAnalysis.tier1.jaimini.atmakaraka && (
                    <View style={styles.jaiminiHighlight}>
                      <LinearGradient colors={['rgba(255,140,0,0.12)', 'rgba(255,140,0,0.03)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                      <Text style={styles.jaiminiLabel}>{t('kpSoulPlanet') || 'Your Core Energy'}</Text>
                      <Text style={styles.jaiminiValue}>{(() => { var p = chartData.advancedAnalysis.tier1.jaimini.atmakaraka.planet || ''; return getKendaraCoreEnergy(p, language); })()}</Text>
                      {chartData.advancedAnalysis.tier1.jaimini.karakas && (
                        <Text style={styles.jaiminiSub}>
                          {language === 'si' ? 'ඔයාගේ අභ්‍යන්තර අරමුණ, වගකීම්, සහ වැඩ කරන රටාව මේකෙන් සරලව තේරුම් ගන්න පුළුවන්.' : 'This summarizes your inner purpose, responsibilities, and expression style.'}
                        </Text>
                      )}
                    </View>
                  )}
                  <View style={styles.jaiminiGrid}>
                    {chartData.advancedAnalysis.tier1.jaimini.karakamsha && (
                      <View style={styles.jaiminiMini}>
                        <Text style={styles.jmLabel}>{t('kpKarakamshaLabel') || 'Life\'s Calling'}</Text>
                        <Text style={styles.jmValue}>{getKendaraLifeStyle(chartData.advancedAnalysis.tier1.jaimini.karakamsha.rashi, language)}</Text>
                        {chartData.advancedAnalysis.tier1.jaimini.karakamsha.themes && (
                          <Text style={styles.jmDesc}>{language === 'si' ? ((chartData.advancedAnalysis.tier1.jaimini.karakamsha.themes.desireSi || chartData.advancedAnalysis.tier1.jaimini.karakamsha.themes.desire) + ' — ' + (chartData.advancedAnalysis.tier1.jaimini.karakamsha.themes.archetypeSi || chartData.advancedAnalysis.tier1.jaimini.karakamsha.themes.archetype)) : (chartData.advancedAnalysis.tier1.jaimini.karakamsha.themes.desire + ' — ' + chartData.advancedAnalysis.tier1.jaimini.karakamsha.themes.archetype)}</Text>
                        )}
                      </View>
                    )}
                    {chartData.advancedAnalysis.tier1.jaimini.arudhaLagna && (
                      <View style={styles.jaiminiMini}>
                        <Text style={styles.jmLabel}>{t('kpArudhaLabel') || 'How Others See You'}</Text>
                        <Text style={styles.jmValue}>{getKendaraLifeStyle(chartData.advancedAnalysis.tier1.jaimini.arudhaLagna.rashi, language)}</Text>
                      </View>
                    )}
                    {chartData.advancedAnalysis.tier1.jaimini.upapadaLagna && (
                      <View style={styles.jaiminiMini}>
                        <Text style={styles.jmLabel}>{t('kpUpapadaLabel') || 'Commitment Style'}</Text>
                        <Text style={styles.jmValue}>{getKendaraLifeStyle(chartData.advancedAnalysis.tier1.jaimini.upapadaLagna.rashi, language)}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Animated.View>
            )}

            {/* Soul Purpose AI explanation */}
            {chartData.chartExplanations?.soulPurpose && chartData.chartExplanations.soulPurpose !== 'N/A' && (
              <View style={styles.aiExplainBox}>
                <Ionicons name="bulb-outline" size={14} color="#FFB800" />
                <Text style={styles.aiExplainText}>{cleanKendaraExplanation(chartData.chartExplanations.soulPurpose, language)}</Text>
              </View>
            )}

            {/* ── SHADBALA ── */}
            {chartData.advancedAnalysis.tier2?.shadbala && typeof chartData.advancedAnalysis.tier2.shadbala === 'object' && (
              <Animated.View entering={FadeInDown.delay(500).duration(600)}>
                <View style={styles.headerRow}>
                  <Ionicons name="bar-chart-outline" size={20} color="#60a5fa" />
                  <Text style={styles.sectionTitle}>
                    {t('kpShadbalaTitle') || 'Your Energy Support Levels'}
                  </Text>
                </View>
                <Text style={{ color: 'rgba(255,214,102,0.6)', fontSize: 13, marginBottom: 12, lineHeight: 20 }}>
                  {language === 'si' ? 'ඔයාගේ ජීවිතේ විවිධ පැති වලට මේ ශක්තීන් කොච්චර උදව් වෙනවද කියලා මෙතනින් පෙන්වනවා.' : 'Shows how strongly each part of your birth pattern supports real-life progress.'}
                </Text>
                <View style={styles.advCard}>
                  {Object.values(chartData.advancedAnalysis.tier2.shadbala).map(function(sb, i) {
                    var pInfo = PLANET_INFO[sb.name] || {};
                    var pct = Math.min((sb.totalRupas || 0) / 300, 1);
                    var barColor = sb.isAdequate ? '#10b981' : '#f59e0b';
                    var strengthLabel = sb.isAdequate ? (t('kpStrong') || 'Strong') : (t('kpWeak') || 'Needs Attention');
                    return (
                      <View key={i} style={styles.sbRow}>
                        <View style={styles.sbTop}>
                          <Text style={[styles.sbPlanet, { color: pInfo.color || '#fff' }]}>
                            {getKendaraPlanetName(sb.name, language)}
                          </Text>
                          <Text style={styles.sbRupas}>{(sb.percentage || 0)}%</Text>
                          <View style={[styles.sbBadge, { backgroundColor: sb.isAdequate ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', borderColor: sb.isAdequate ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)' }]}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: sb.isAdequate ? '#10b981' : '#f59e0b' }}>
                              {strengthLabel}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.sbBarTrack}>
                          <View style={[styles.sbBarFill, { width: (pct * 100) + '%', backgroundColor: barColor }]} />
                        </View>
                        <Text style={styles.sbNote}>{getKendaraShadbalaPersonalDetail(sb, language)}</Text>
                      </View>
                    );
                  })}
                </View>
              </Animated.View>
            )}

            {/* Planet Power AI explanation */}
            {chartData.chartExplanations?.planetPower && chartData.chartExplanations.planetPower !== 'N/A' && (
              <View style={styles.aiExplainBox}>
                <Ionicons name="bulb-outline" size={14} color="#FFB800" />
                <Text style={styles.aiExplainText}>{cleanKendaraExplanation(chartData.chartExplanations.planetPower, language)}</Text>
              </View>
            )}

            {/* ── BHRIGU BINDU ── */}
            {chartData.advancedAnalysis.tier2?.bhriguBindu && (
              <Animated.View entering={FadeInDown.delay(600).duration(600)}>
                <View style={styles.headerRow}>
                  <Ionicons name="locate-outline" size={20} color="#FFB800" />
                  <Text style={styles.sectionTitle}>
                    {t('kpBhriguTitle') || 'Your Destiny Point'}
                  </Text>
                </View>
                <Text style={{ color: 'rgba(255,214,102,0.6)', fontSize: 13, marginBottom: 12, lineHeight: 20 }}>
                  {language === 'si' ? 'ඔයාගේ වර්ධනයට අවශ්‍ය අවස්ථා සහ ජීවිත අරමුණු වැඩිපුරම ක්‍රියාත්මක වෙන තැන මෙතනින් බලන්න පුළුවන්.' : 'Shows the life area where growth, opportunity, and purpose tend to activate strongly.'}
                </Text>
                <View style={[styles.advCard, { borderColor: 'rgba(255,184,0,0.15)' }]}>
                  <LinearGradient colors={['rgba(255,184,0,0.08)', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <View style={styles.bbCircle}>
                      <Text style={styles.bbDeg}>{Number(chartData.advancedAnalysis.tier2.bhriguBindu.degree || 0).toFixed(1)}°</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bbRashi}>{getKendaraLifeStyle(chartData.advancedAnalysis.tier2.bhriguBindu.rashi, language)}</Text>
                      <Text style={styles.bbNak}>{getKendaraBirthFocus(chartData.advancedAnalysis.tier2.bhriguBindu.nakshatra, language)}</Text>
                    </View>
                  </View>
                  {chartData.advancedAnalysis.tier2.bhriguBindu.interpretation && (
                    <Text style={styles.bbInterp}>{cleanKendaraExplanation(language === 'si' ? (chartData.advancedAnalysis.tier2.bhriguBindu.interpretationSi || chartData.advancedAnalysis.tier2.bhriguBindu.interpretation) : chartData.advancedAnalysis.tier2.bhriguBindu.interpretation, language)}</Text>
                  )}
                  <Text style={styles.bbPersonalNote}>{getKendaraBhriguPersonalDetail(chartData.advancedAnalysis.tier2.bhriguBindu, language)}</Text>
                </View>
              </Animated.View>
            )}

            {/* Destiny Point AI explanation */}
            {chartData.chartExplanations?.destinyPoint && chartData.chartExplanations.destinyPoint !== 'N/A' && (
              <View style={styles.aiExplainBox}>
                <Ionicons name="bulb-outline" size={14} color="#FFB800" />
                <Text style={styles.aiExplainText}>{cleanKendaraExplanation(chartData.chartExplanations.destinyPoint, language)}</Text>
              </View>
            )}

            {/* ── PAST LIFE ── */}
            {chartData.advancedAnalysis.tier3?.pastLife && (
              <Animated.View entering={FadeInDown.delay(700).duration(600)}>
                <View style={styles.headerRow}>
                  <Ionicons name="time-outline" size={20} color="#a78bfa" />
                  <Text style={styles.sectionTitle}>
                    {t('kpPastLifeTitle') || 'Your Deeper Patterns'}
                  </Text>
                </View>
                <Text style={{ color: 'rgba(255,214,102,0.6)', fontSize: 13, marginBottom: 12, lineHeight: 20 }}>
                  {language === 'si' ? 'ඔයාට පුරුදු දේවල් සහ දැන් දියුණු වෙන්න හොඳම දිශාව මෙතනින් පෙන්වනවා.' : 'Shows familiar old patterns and the healthier direction for growth now.'}
                </Text>
                <View style={[styles.advCard, { borderColor: 'rgba(167,139,250,0.15)' }]}>
                  <LinearGradient colors={['rgba(167,139,250,0.08)', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
                  {chartData.advancedAnalysis.tier3.pastLife.pastLife?.ketuThemes && (
                    <View style={styles.plRow}>
                      <Text style={styles.plLabel}>{t('kpPastLifeStory') || 'Core Tendencies'}</Text>
                      <Text style={styles.plValue}>
                        {language === 'si' ? (chartData.advancedAnalysis.tier3.pastLife.pastLife.ketuThemes.domainSi || chartData.advancedAnalysis.tier3.pastLife.pastLife.ketuThemes.domain) : `${chartData.advancedAnalysis.tier3.pastLife.pastLife.ketuThemes.archetype} — ${chartData.advancedAnalysis.tier3.pastLife.pastLife.ketuThemes.domain}`}
                      </Text>
                      <Text style={styles.plIndicator}>{getKendaraKetuPatternDetail(chartData.advancedAnalysis.tier3.pastLife, language)}</Text>
                    </View>
                  )}
                  {chartData.advancedAnalysis.tier3.pastLife.currentLifeDirection?.rahuThemes && (
                    <View style={styles.plRow}>
                      <Text style={styles.plLabel}>{t('kpLifeDirection') || 'Growth Direction'}</Text>
                      <Text style={styles.plValue}>
                        {language === 'si' ? (chartData.advancedAnalysis.tier3.pastLife.currentLifeDirection.rahuThemes.growthSi || chartData.advancedAnalysis.tier3.pastLife.currentLifeDirection.rahuThemes.growth) : chartData.advancedAnalysis.tier3.pastLife.currentLifeDirection.rahuThemes.growth}
                      </Text>
                      <Text style={styles.plIndicator}>{getKendaraRahuDirectionDetail(chartData.advancedAnalysis.tier3.pastLife, language)}</Text>
                    </View>
                  )}
                  {chartData.advancedAnalysis.tier3.pastLife.karmaBalance && (
                    <View style={styles.plRow}>
                      <Text style={styles.plLabel}>{t('kpKarmaBalance') || 'Life Balance'}</Text>
                      <Text style={styles.plValue}>
                        {t('kpGood') || 'Good'}: {chartData.advancedAnalysis.tier3.pastLife.karmaBalance.good || 0}
                        {'  •  '}
                        {t('kpChallenging') || 'Challenging'}: {chartData.advancedAnalysis.tier3.pastLife.karmaBalance.challenging || 0}
                      </Text>
                      <Text style={styles.plIndicator}>{getKendaraKarmaBalanceDetail(chartData.advancedAnalysis.tier3.pastLife, language)}</Text>
                    </View>
                  )}
                  {chartData.advancedAnalysis.tier3.pastLife.pastLifeMerit?.assessment && (
                    <View style={styles.plRow}>
                      <Text style={styles.plLabel}>{t('kpPastLifeMerit') || 'Inherent Strengths'}</Text>
                      <Text style={styles.plValue}>{language === 'si' ? ({ 'highly_meritorious': 'ඉහළ ස්වභාවික ශක්ති', 'karmic_debts': 'වර්ධනය කළ යුතු ක්ෂේත්‍ර', 'mixed': 'සමබර' }[chartData.advancedAnalysis.tier3.pastLife.pastLifeMerit.assessment] || chartData.advancedAnalysis.tier3.pastLife.pastLifeMerit.assessment) : ({ 'highly_meritorious': 'Strong Natural Abilities', 'karmic_debts': 'Areas for Growth', 'mixed': 'Balanced' }[chartData.advancedAnalysis.tier3.pastLife.pastLifeMerit.assessment] || chartData.advancedAnalysis.tier3.pastLife.pastLifeMerit.assessment)}</Text>
                      <Text style={styles.plIndicator}>{getKendaraMeritDetail(chartData.advancedAnalysis.tier3.pastLife, language)}</Text>
                    </View>
                  )}
                </View>
              </Animated.View>
            )}

            {/* Past Life AI explanation */}
            {chartData.chartExplanations?.pastLife && chartData.chartExplanations.pastLife !== 'N/A' && (
              <View style={styles.aiExplainBox}>
                <Ionicons name="bulb-outline" size={14} color="#FFB800" />
                <Text style={styles.aiExplainText}>{cleanKendaraExplanation(chartData.chartExplanations.pastLife, language)}</Text>
              </View>
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* ═══ JYOTISH ADVANCED ANALYSIS SECTIONS ═══     */}
            {/* ═══════════════════════════════════════════════ */}

            {/* ── DASHA TIMELINE ── */}
            {jyotishData?.dasha && (
              <Animated.View entering={FadeInDown.delay(820).duration(600)}>
                <View style={styles.headerRow}>
                  <Ionicons name="git-branch-outline" size={20} color="#A78BFA" />
                  <Text style={styles.sectionTitle}>
                    {language === 'si' ? 'ජීවිතයේ මේ කාලේ බලපාන ශක්තිය' : 'Your Current Life Timeline'}
                  </Text>
                </View>
                <Text style={{ color: 'rgba(255,214,102,0.6)', fontSize: 13, marginBottom: 12, lineHeight: 20 }}>
                  {language === 'si' ? 'ඔයාගේ ජීවිතේ එක් එක් කාලයට වැඩිපුරම බලපාන ග්‍රහ ශක්තිය මෙතනින් බලන්න පුළුවන්.' : 'Shows which planet energy is most active in each chapter of your life.'}
                </Text>
                <View style={[styles.advCard, { borderColor: 'rgba(167,139,250,0.18)' }]}>
                  <LinearGradient colors={['rgba(167,139,250,0.08)', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

                  {/* Current Period Highlight */}
                  {jyotishData.dasha.currentMahadasha && (
                    <View style={kj.currentDashaBox}>
                      <LinearGradient colors={['rgba(255,140,0,0.12)', 'rgba(255,184,0,0.04)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                      <View style={kj.currentDashaHeader}>
                        <View style={kj.currentDashaDot} />
                        <Text style={kj.currentDashaLabel}>{language === 'si' ? 'දැනට ක්‍රියාත්මක වෙන කාල ශක්තිය' : 'Current Active Period'}</Text>
                      </View>
                      <Text style={kj.currentDashaPlanet}>
                        {language === 'si' ? (PLANET_INFO[jyotishData.dasha.currentMahadasha.planet]?.si || jyotishData.dasha.currentMahadasha.planet || '--') : (jyotishData.dasha.currentMahadasha.planet || '--')}
                        {jyotishData.dasha.currentAntardasha ? ' → ' + (language === 'si' ? (PLANET_INFO[jyotishData.dasha.currentAntardasha.planet]?.si || jyotishData.dasha.currentAntardasha.planet) : jyotishData.dasha.currentAntardasha.planet) : ''}
                      </Text>
                      {jyotishData.dasha.currentPratyantar && (
                        <Text style={kj.currentDashaSub}>
                          {language === 'si' ? 'අතුරු කාලය නම්: ' : 'Sub: '}{language === 'si' ? (PLANET_INFO[jyotishData.dasha.currentPratyantar.planet]?.si || jyotishData.dasha.currentPratyantar.planet) : jyotishData.dasha.currentPratyantar.planet}
                        </Text>
                      )}
                      <Text style={kj.currentDashaNote}>{getKendaraDashaPersonalNote(jyotishData.dasha, language, chartData.advancedAnalysis?.tier2?.shadbala)}</Text>
                    </View>
                  )}

                  {/* Timeline bars */}
                  {(jyotishData.dasha.mahadashas || []).map(function (md, i) {
                    var now = new Date();
                    var start = new Date(md.startTime || md.start);
                    var end = new Date(md.endTime || md.end);
                    var totalMs = end - start;
                    var elapsedMs = Math.max(0, Math.min(now - start, totalMs));
                    var progress = totalMs > 0 ? Math.round((elapsedMs / totalMs) * 100) : 0;
                    var isCurrent = now >= start && now <= end;
                    var isPast = now > end;
                    var barColor = isCurrent ? '#FFB800' : isPast ? 'rgba(255,255,255,0.15)' : 'rgba(167,139,250,0.50)';
                    var textOp = isPast ? 0.35 : 1;
                    var years = md.durationYears ? parseFloat(md.durationYears).toFixed(0) : Math.round((end - start) / (365.25 * 24 * 60 * 60 * 1000));
                    return (
                      <View key={i} style={[kj.dashaRow, isCurrent && kj.dashaRowCurrent]}>
                        <View style={kj.dashaLeft}>
                          <Text style={[kj.dashaPlanet, { opacity: textOp, color: isCurrent ? '#FFB800' : '#FFE8B0' }]}>{language === 'si' ? (PLANET_INFO[md.planet]?.si || md.planet) : md.planet}</Text>
                          <Text style={[kj.dashaYears, { opacity: textOp }]}>{years}{language === 'si' ? ' අවු' : 'y'}</Text>
                        </View>
                        <View style={kj.dashaBarWrap}>
                          <View style={kj.dashaBarTrack}>
                            <View style={[kj.dashaBarFill, { width: (isCurrent ? progress : isPast ? 100 : 0) + '%', backgroundColor: barColor }]} />
                          </View>
                          <Text style={[kj.dashaDate, { opacity: textOp }]}>
                            {start.getFullYear()} — {end.getFullYear()}
                          </Text>
                        </View>
                        {isCurrent && <View style={kj.dashaLive} />}
                      </View>
                    );
                  })}
                </View>
              </Animated.View>
            )}

            {/* ── MANGAL DOSHA ── */}
            {jyotishData?.mangalDosha && (
              <Animated.View entering={FadeInDown.delay(860).duration(600)}>
                <View style={styles.headerRow}>
                  <Ionicons name="flame-outline" size={20} color={jyotishData.mangalDosha.hasDosha ? '#F87171' : '#34D399'} />
                  <Text style={styles.sectionTitle}>
                    {language === 'si' ? 'සබඳතා වලට කුජගෙන් එන බලපෑම' : 'Mars Influence in Relationships'}
                  </Text>
                </View>
                <Text style={{ color: 'rgba(255,214,102,0.6)', fontSize: 13, marginBottom: 12, lineHeight: 20 }}>
                  {language === 'si' ? 'සබඳතා සහ විවාහය ගැන කුජ ග්‍රහයාගෙන් පෙන්වන විස්තර මෙතනින් බලන්න.' : 'Shows whether Mars asks for extra patience in marriage and long-term relationships.'}
                </Text>
                <View style={[styles.advCard, {
                  borderColor: jyotishData.mangalDosha.hasDosha
                    ? (jyotishData.mangalDosha.isHigh ? 'rgba(239,68,68,0.30)' : 'rgba(245,158,11,0.25)')
                    : 'rgba(52,211,153,0.20)',
                  overflow: 'hidden',
                }]}>
                  <LinearGradient
                    colors={jyotishData.mangalDosha.hasDosha
                      ? ['rgba(239,68,68,0.08)', 'transparent']
                      : ['rgba(52,211,153,0.08)', 'transparent']}
                    style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <View style={[kj.doshaOrb, {
                      backgroundColor: jyotishData.mangalDosha.hasDosha ? 'rgba(239,68,68,0.15)' : 'rgba(52,211,153,0.15)',
                      borderColor: jyotishData.mangalDosha.hasDosha ? 'rgba(239,68,68,0.35)' : 'rgba(52,211,153,0.35)',
                    }]}>
                      <Ionicons
                        name={jyotishData.mangalDosha.hasDosha ? 'flame' : 'shield-checkmark'}
                        size={26}
                        color={jyotishData.mangalDosha.hasDosha ? '#EF4444' : '#34D399'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[kj.doshaStatus, {
                        color: jyotishData.mangalDosha.hasDosha ? '#F87171' : '#34D399',
                      }]}>
                        {jyotishData.mangalDosha.hasDosha
                          ? (jyotishData.mangalDosha.isHigh
                            ? (language === 'si' ? '🔴 සබඳතා වලදී වැඩි ඉවසීමක් අවශ්‍යයි' : '🔴 Strong Mars Influence')
                            : (language === 'si' ? '🟡 සබඳතා වලදී ටිකක් කල්පනාවෙන් ඉන්න' : '🟡 Moderate Mars Influence'))
                          : (language === 'si' ? '🟢 කුජගෙන් විශේෂ පීඩනයක් දැනෙන්නේ නැහැ' : '🟢 No Significant Mars Influence')}
                      </Text>
                      {jyotishData.mangalDosha.description && (
                        <Text style={kj.doshaDesc}>{language === 'si' ? (jyotishData.mangalDosha.descriptionSi || jyotishData.mangalDosha.description) : jyotishData.mangalDosha.description}</Text>
                      )}
                    </View>
                  </View>
                </View>
              </Animated.View>
            )}

            {/* ── SADE SATI STATUS ── */}
            {jyotishData?.sadeSati && (
              <Animated.View entering={FadeInDown.delay(900).duration(600)}>
                <View style={styles.headerRow}>
                  <Ionicons name="planet-outline" size={20} color={jyotishData.sadeSati.status ? '#F59E0B' : '#34D399'} />
                  <Text style={styles.sectionTitle}>
                    {language === 'si' ? 'සෙනසුරු ගමනේ දැනට පවතින බලපෑම' : 'Current Saturn Pressure'}
                  </Text>
                </View>
                <Text style={{ color: 'rgba(255,214,102,0.6)', fontSize: 13, marginBottom: 12, lineHeight: 20 }}>
                  {language === 'si' ? 'දැනට සෙනසුරු ගමන නිසා වගකීම් සහ ඉවසීම ඕන කාලයක්ද කියලා මෙතනින් බලන්න.' : 'Shows whether Saturn is currently bringing more responsibility, delay, or pressure.'}
                </Text>
                <View style={[styles.advCard, {
                  borderColor: jyotishData.sadeSati.status ? 'rgba(245,158,11,0.25)' : 'rgba(52,211,153,0.20)',
                  overflow: 'hidden',
                }]}>
                  <LinearGradient
                    colors={jyotishData.sadeSati.status
                      ? ['rgba(245,158,11,0.08)', 'transparent']
                      : ['rgba(52,211,153,0.08)', 'transparent']}
                    style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <View style={[kj.doshaOrb, {
                      backgroundColor: jyotishData.sadeSati.status ? 'rgba(245,158,11,0.15)' : 'rgba(52,211,153,0.15)',
                      borderColor: jyotishData.sadeSati.status ? 'rgba(245,158,11,0.35)' : 'rgba(52,211,153,0.35)',
                    }]}>
                      <Text style={{ fontSize: 22 }}>{jyotishData.sadeSati.status ? '🪐' : '🛡️'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[kj.doshaStatus, {
                        color: jyotishData.sadeSati.status ? '#F59E0B' : '#34D399',
                      }]}>
                        {jyotishData.sadeSati.status
                          ? (language === 'si' ? '⚠ මේ කාලේ සෙනසුරු පීඩනය වැඩියි' : '⚠ Saturn Transit is Active')
                          : (language === 'si' ? '✓ දැන් සෙනසුරු බලපෑම අඩුයි' : '✓ Saturn Transit Not Active')}
                      </Text>
                      {jyotishData.sadeSati.phase && (
                        <Text style={kj.doshaDesc}>
                          {language === 'si' ? 'අවස්ථාව: ' : 'Phase: '}{language === 'si' ? ({ 'Rising': 'ආරම්භක අදියර', 'Peak': 'උච්චතම අවස්ථාව', 'Setting': 'අවසන් අදියර' }[jyotishData.sadeSati.phase] || jyotishData.sadeSati.phase) : jyotishData.sadeSati.phase}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              </Animated.View>
            )}

            {/* ── CHALIT CHART (Planet Shifts) ── */}
            {jyotishData?.chalit && jyotishData.chalit.planets && (
              <Animated.View entering={FadeInDown.delay(940).duration(600)}>
                <View style={styles.headerRow}>
                  <Ionicons name="swap-horizontal-outline" size={20} color="#818CF8" />
                  <Text style={styles.sectionTitle}>
                    {language === 'si' ? 'ග්‍රහයින් ක්‍රියාත්මක වන ප්‍රදේශ' : 'Where Planets Work in Real Life'}
                  </Text>
                </View>
                <Text style={{ color: 'rgba(255,214,102,0.6)', fontSize: 13, marginBottom: 12, lineHeight: 20 }}>
                  {language === 'si' ? 'උපන් වෙලාව අනුව සමහර ග්‍රහයින් කේන්දරේ පෙන්වන තැන්වලට වඩා වෙනස් තැන්වල ප්‍රතිඵල දෙන්න පුළුවන්.' : 'Sometimes planets give results for a different house than where they initially appear due to the Earth\'s real-time rotation (Bhava Chalit).'}
                </Text>
                <View style={[styles.advCard, { borderColor: 'rgba(129,140,248,0.15)' }]}>
                  <LinearGradient colors={['rgba(129,140,248,0.06)', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                  {(Array.isArray(jyotishData.chalit.planets) ? jyotishData.chalit.planets : []).map(function (p, i) {
                    var shifted = p.d1House !== p.house && p.d1House && p.house;
                    if (!shifted) return null;
                    var pInfo = PLANET_INFO[p.name] || {};
                    var pColor = pInfo.color || '#818CF8';
                    return (
                      <View key={i} style={kj.chalitRow}>
                        <View style={[kj.chalitDot, { backgroundColor: pColor }]} />
                        <Text style={[kj.chalitPlanet, { color: pColor }]}>
                          {language === 'si' ? (pInfo.si || p.name) : p.name}
                        </Text>
                        <View style={kj.chalitShiftBadge}>
                          <Text style={kj.chalitShiftFrom}>H{p.d1House}</Text>
                          <Ionicons name="arrow-forward" size={10} color="#818CF8" />
                          <Text style={kj.chalitShiftTo}>H{p.house}</Text>
                        </View>
                        <Text style={kj.chalitLabel}>{language === 'si' ? 'මාරු විය' : 'Shifted'}</Text>
                      </View>
                    );
                  })}
                  {(Array.isArray(jyotishData.chalit.planets) ? jyotishData.chalit.planets : []).filter(function (p) { return p.d1House !== p.house && p.d1House && p.house; }).length === 0 && (
                    <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                      <Ionicons name="checkmark-circle" size={24} color="#34D399" />
                      <Text style={{ color: 'rgba(52,211,153,0.70)', fontSize: 12, fontWeight: '600', marginTop: 6 }}>
                        {language === 'si' ? 'සියලු ග්‍රහයින් තමන්ගේ තැන්වලම ඉන්නවා' : 'All planets remain in their sign houses'}
                      </Text>
                    </View>
                  )}
                </View>
              </Animated.View>
            )}

            {/* ── VARGA CHART PICKER ── */}
            {hasBirthData && (
              <Animated.View entering={FadeInDown.delay(980).duration(600)}>
                <View style={styles.headerRow}>
                  <Ionicons name="layers-outline" size={20} color="#06B6D4" />
                  <Text style={styles.sectionTitle}>
                    {language === 'si' ? 'ජීවිතේ විවිධ කොටස් ගැන විස්තර' : 'Detailed Life Area Charts'}
                  </Text>
                </View>
                <Text style={{ color: 'rgba(255,214,102,0.6)', fontSize: 13, marginBottom: 12, lineHeight: 20 }}>
                  {language === 'si' ? 'විවාහය, රැකියාව, දරුවන්, සහ දේපළ වගේ දේවල් වෙන වෙනම තේරුම් ගන්න මේ ටැබ් පාවිච්චි කරන්න.' : 'Use these tabs to understand one life area at a time, such as marriage, career, children, property, and learning.'}
                </Text>
                <View style={[styles.advCard, { borderColor: 'rgba(6,182,212,0.15)' }]}>
                  <LinearGradient colors={['rgba(6,182,212,0.06)', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={kj.vargaPickerRow}>
                    {[
                      { key: 'd9', label: 'D9', name: language === 'si' ? 'විවාහය' : 'Relationships', sub: language === 'si' ? 'විවාහය ගැන' : 'Relationships' },
                      { key: 'd10', label: 'D10', name: language === 'si' ? 'රැකියාව' : 'Career', sub: language === 'si' ? 'රැකියාව ගැන' : 'Career' },
                      { key: 'd7', label: 'D7', name: language === 'si' ? 'දරුවන්' : 'Children', sub: language === 'si' ? 'දරුවන් ගැන' : 'Children' },
                      { key: 'd4', label: 'D4', name: language === 'si' ? 'දේපළ' : 'Property & Assets', sub: language === 'si' ? 'දේපළ ගැන' : 'Assets' },
                      { key: 'd24', label: 'D24', name: language === 'si' ? 'ඉගෙනීම' : 'Education & Learning', sub: language === 'si' ? 'ඉගෙනීම ගැන' : 'Learning' },
                      { key: 'd20', label: 'D20', name: language === 'si' ? 'ඇතුළත වර්ධනය' : 'Inner Growth', sub: language === 'si' ? 'හිත/ආගම ගැන' : 'Growth' },
                    ].map(function (v) {
                      var isActive = selectedVarga === v.key;
                      return (
                        <TouchableOpacity key={v.key} activeOpacity={0.7} onPress={function () { setSelectedVarga(v.key); }}>
                          <View style={[kj.vargaPill, isActive && kj.vargaPillActive]}>
                            {isActive && <LinearGradient colors={['rgba(6,182,212,0.20)', 'rgba(6,182,212,0.05)']} style={StyleSheet.absoluteFill} />}
                            <Text style={[kj.vargaPillLabel, isActive && kj.vargaPillLabelActive]}>{v.label}</Text>
                            <Text style={[kj.vargaPillName, isActive && kj.vargaPillNameActive]}>{v.sub}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  <VargaChartDisplay division={selectedVarga} birthDateTime={birthDateTime} lat={birthLat} lng={birthLng} language={language} />
                </View>
              </Animated.View>
            )}

            {/* ═══ MARAKA APALA (Dangerous Periods) ═══ */}
            {(marakaData || marakaLoading) && (
              <Animated.View entering={FadeInDown.delay(750).duration(600)}>
                <View style={styles.headerRow}>
                  <Ionicons name="shield-outline" size={20} color="#f87171" />
                  <Text style={styles.sectionTitle}>
                    {language === 'si' ? 'පරිස්සම් වෙන්න ඕන කාල' : 'Sensitive Periods'}
                  </Text>
                </View>
                <Text style={{ color: 'rgba(255,214,102,0.6)', fontSize: 13, marginBottom: 12, lineHeight: 20 }}>
                  {language === 'si' ? 'ග්‍රහ ගමනට අනුව සෞඛ්‍යය සහ ආරක්ෂාව ගැන ටිකක් වැඩියෙන් හිතන්න ඕන කාල සීමාවන් මෙතනින් බලන්න පුළුවන්.' : 'High-friction periods based on your current astrological cycle where taking caution with health and decisions is advised. Avoid starting big new things.'}
                </Text>

                {marakaLoading && !marakaData ? (
                  <View style={[styles.advCard, { alignItems: 'center', paddingVertical: 24 }]}>
                    <CosmicLoader size={28} color="#f87171" />
                    <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 10, fontSize: 13 }}>
                      {language === 'si' ? 'සංවේදී කාල විශ්ලේෂණය කරනවා...' : 'Analyzing sensitive periods...'}
                    </Text>
                  </View>
                ) : marakaData ? (
                  <View>
                    {/* Overall Status Card */}
                    <View style={[styles.advCard, {
                      borderColor: marakaData.status === 'CRITICAL' ? 'rgba(239,68,68,0.4)'
                        : marakaData.status === 'HIGH' ? 'rgba(239,68,68,0.25)'
                        : marakaData.status === 'MODERATE' ? 'rgba(245,158,11,0.25)'
                        : 'rgba(16,185,129,0.25)',
                      overflow: 'hidden',
                    }]}>
                      <LinearGradient
                        colors={
                          marakaData.status === 'CRITICAL' ? ['rgba(239,68,68,0.15)', 'rgba(239,68,68,0.03)']
                          : marakaData.status === 'HIGH' ? ['rgba(239,68,68,0.1)', 'rgba(239,68,68,0.02)']
                          : marakaData.status === 'MODERATE' ? ['rgba(245,158,11,0.1)', 'rgba(245,158,11,0.02)']
                          : ['rgba(16,185,129,0.1)', 'rgba(16,185,129,0.02)']
                        }
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      />
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={[styles.marakaStatusOrb, {
                          backgroundColor: marakaData.status === 'CRITICAL' ? 'rgba(239,68,68,0.2)'
                            : marakaData.status === 'HIGH' ? 'rgba(239,68,68,0.15)'
                            : marakaData.status === 'MODERATE' ? 'rgba(245,158,11,0.15)'
                            : 'rgba(16,185,129,0.15)',
                          borderColor: marakaData.status === 'CRITICAL' ? 'rgba(239,68,68,0.5)'
                            : marakaData.status === 'HIGH' ? 'rgba(239,68,68,0.35)'
                            : marakaData.status === 'MODERATE' ? 'rgba(245,158,11,0.35)'
                            : 'rgba(16,185,129,0.35)',
                        }]}>
                          <Ionicons
                            name={marakaData.status === 'SAFE' ? 'shield-checkmark' : 'warning'}
                            size={24}
                            color={marakaData.status === 'CRITICAL' ? '#ef4444'
                              : marakaData.status === 'HIGH' ? '#f87171'
                              : marakaData.status === 'MODERATE' ? '#f59e0b'
                              : '#10b981'}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.marakaStatusTitle, {
                            color: marakaData.status === 'CRITICAL' ? '#ef4444'
                              : marakaData.status === 'HIGH' ? '#f87171'
                              : marakaData.status === 'MODERATE' ? '#f59e0b'
                              : '#10b981',
                          }]}>
                            {language === 'si'
                              ? (marakaData.status === 'CRITICAL' ? '⚠️ ඉහළ සංවේදිතාව' : marakaData.status === 'HIGH' ? '🔶 සංවේදී කාලය' : marakaData.status === 'MODERATE' ? '🟡 කල්පනාවෙන් ඉන්න' : '🟢 හොඳින් ඉදිරියටම යතැහැකි')
                              : (marakaData.status === 'CRITICAL' ? '⚠️ High Sensitivity' : marakaData.status === 'HIGH' ? '🔶 Elevated Sensitivity' : marakaData.status === 'MODERATE' ? '🟡 Be Mindful' : '🟢 Clear Ahead')}
                          </Text>
                          <Text style={styles.marakaStatusDesc}>
                            {language === 'si' ? marakaData.statusSi : marakaData.statusEn}
                          </Text>
                        </View>
                      </View>
                      {marakaData.activeCount > 0 && (
                        <View style={styles.marakaCountRow}>
                          <View style={styles.marakaCountBadge}>
                            <Text style={styles.marakaCountNum}>{marakaData.activeCount}</Text>
                            <Text style={styles.marakaCountLabel}>
                              {language === 'si' ? 'ක්‍රියාත්මක' : 'Active'}
                            </Text>
                          </View>
                          <View style={[styles.marakaCountBadge, { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.25)' }]}>
                            <Text style={[styles.marakaCountNum, { color: '#f59e0b' }]}>{(marakaData.upcomingApala || []).length}</Text>
                            <Text style={[styles.marakaCountLabel, { color: 'rgba(245,158,11,0.7)' }]}>
                              {language === 'si' ? 'ඉදිරි' : 'Upcoming'}
                            </Text>
                          </View>
                          <View style={[styles.marakaCountBadge, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }]}>
                            <Text style={[styles.marakaCountNum, { color: 'rgba(255,255,255,0.6)' }]}>{marakaData.totalCount}</Text>
                            <Text style={[styles.marakaCountLabel, { color: 'rgba(255,255,255,0.35)' }]}>
                              {language === 'si' ? 'මුළු' : 'Total'}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>

                    {/* Active Apala List */}
                    {marakaData.activeApala && marakaData.activeApala.length > 0 && (
                      <View style={{ marginTop: 4 }}>
                        <Text style={styles.marakaSubHeader}>
                          <Ionicons name="radio-button-on" size={12} color="#ef4444" />
                          {'  ' + (language === 'si' ? 'දැනට ක්‍රියාත්මක වන අපල' : 'Currently Active Periods')}
                        </Text>
                        {marakaData.activeApala.map(function(apala, i) {
                          var sevColor = apala.severity === 'CRITICAL' ? '#ef4444' : apala.severity === 'HIGH' ? '#f87171' : apala.severity === 'MODERATE' ? '#f59e0b' : '#60a5fa';
                          var isExpanded = expandedApala === 'active-' + i;
                          var startDate = new Date(apala.start);
                          var endDate = new Date(apala.end);
                          var daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
                          return (
                            <TouchableOpacity key={'active-' + i} activeOpacity={0.7} onPress={function() { setExpandedApala(isExpanded ? null : 'active-' + i); }}>
                              <Animated.View entering={FadeInDown.delay(i * 100).duration(400)} style={[styles.marakaApalaCard, { borderLeftColor: sevColor }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                                  <View style={[styles.marakaSevDot, { backgroundColor: sevColor }]} />
                                  <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                      <Text style={styles.marakaApalaTitle}>
                                        {language === 'si' ? apala.title : apala.titleEn}
                                      </Text>
                                      <View style={[styles.marakaSevBadge, { backgroundColor: sevColor + '18', borderColor: sevColor + '40' }]}>
                                        <Text style={[styles.marakaSevText, { color: sevColor }]}>{apala.severity}</Text>
                                      </View>
                                    </View>
                                    <Text style={styles.marakaApalaDesc}>
                                      {language === 'si' ? apala.description : apala.descriptionEn}
                                    </Text>
                                    <View style={styles.marakaPeriodRow}>
                                      <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.35)" />
                                      <Text style={styles.marakaPeriodText}>
                                        {startDate.toLocaleDateString()} — {endDate.toLocaleDateString()}
                                      </Text>
                                      <View style={styles.marakaDaysLeftBadge}>
                                        <Text style={styles.marakaDaysLeftText}>
                                          {daysLeft > 0
                                            ? (language === 'si' ? 'දින ' + daysLeft + ' ක් ඉතිරියි' : daysLeft + ' days left')
                                            : (language === 'si' ? 'අද ඉවර වෙනවා' : 'Ends today')}
                                        </Text>
                                      </View>
                                    </View>
                                    {/* Expandable remedies */}
                                    {isExpanded && apala.remedies && apala.remedies.length > 0 && (
                                      <Animated.View entering={FadeIn.duration(300)} style={styles.marakaRemediesBox}>
                                        <Text style={styles.marakaRemediesTitle}>
                                          {language === 'si' ? '💡 මඟ පෙන්වීම්' : '💡 Guidance'}
                                        </Text>
                                        {apala.remedies.map(function(r, ri) {
                                          return (
                                            <View key={ri} style={styles.marakaRemedyRow}>
                                              <Text style={styles.marakaRemedyBullet}>•</Text>
                                              <Text style={styles.marakaRemedyText}>
                                                {language === 'si' ? r.si : r.en}
                                              </Text>
                                            </View>
                                          );
                                        })}
                                      </Animated.View>
                                    )}
                                    {!isExpanded && apala.remedies && apala.remedies.length > 0 && (
                                      <Text style={styles.marakaTapHint}>
                                        {language === 'si' ? '↓ මඟ පෙන්වීම් බලන්න මෙතන ඔබන්න' : '↓ Tap for practical guidance'}
                                      </Text>
                                    )}
                                  </View>
                                </View>
                              </Animated.View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    {/* Upcoming Apala List */}
                    {marakaData.upcomingApala && marakaData.upcomingApala.length > 0 && (
                      <View style={{ marginTop: 12 }}>
                        <Text style={styles.marakaSubHeader}>
                          <Ionicons name="time-outline" size={12} color="#f59e0b" />
                          {'  ' + (language === 'si' ? 'ඉදිරියට එන අපල කාල' : 'Upcoming Periods')}
                        </Text>
                        {marakaData.upcomingApala.slice(0, 5).map(function(apala, i) {
                          var sevColor = apala.severity === 'CRITICAL' ? '#ef4444' : apala.severity === 'HIGH' ? '#f87171' : apala.severity === 'MODERATE' ? '#f59e0b' : '#60a5fa';
                          var isExpanded = expandedApala === 'upcoming-' + i;
                          var startDate = new Date(apala.start);
                          var endDate = new Date(apala.end);
                          var daysUntil = Math.ceil((startDate - new Date()) / (1000 * 60 * 60 * 24));
                          return (
                            <TouchableOpacity key={'upcoming-' + i} activeOpacity={0.7} onPress={function() { setExpandedApala(isExpanded ? null : 'upcoming-' + i); }}>
                              <Animated.View entering={FadeInDown.delay(i * 80).duration(400)} style={[styles.marakaApalaCard, { borderLeftColor: sevColor, opacity: 0.8 }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                                  <View style={[styles.marakaSevDot, { backgroundColor: sevColor, opacity: 0.6 }]} />
                                  <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                      <Text style={[styles.marakaApalaTitle, { color: 'rgba(224,231,255,0.7)' }]}>
                                        {language === 'si' ? apala.title : apala.titleEn}
                                      </Text>
                                      <View style={[styles.marakaSevBadge, { backgroundColor: sevColor + '12', borderColor: sevColor + '30' }]}>
                                        <Text style={[styles.marakaSevText, { color: sevColor, opacity: 0.8 }]}>{apala.severity}</Text>
                                      </View>
                                    </View>
                                    <View style={styles.marakaPeriodRow}>
                                      <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.25)" />
                                      <Text style={[styles.marakaPeriodText, { color: 'rgba(255,255,255,0.35)' }]}>
                                        {startDate.toLocaleDateString()} — {endDate.toLocaleDateString()}
                                      </Text>
                                      <View style={[styles.marakaDaysLeftBadge, { backgroundColor: 'rgba(245,158,11,0.08)' }]}>
                                        <Text style={[styles.marakaDaysLeftText, { color: 'rgba(245,158,11,0.7)' }]}>
                                          {language === 'si' ? 'දින ' + daysUntil + ' කින්' : 'in ' + daysUntil + ' days'}
                                        </Text>
                                      </View>
                                    </View>
                                    {/* Expandable remedies */}
                                    {isExpanded && (
                                      <Animated.View entering={FadeIn.duration(300)}>
                                        <Text style={[styles.marakaApalaDesc, { marginTop: 6 }]}>
                                          {language === 'si' ? apala.description : apala.descriptionEn}
                                        </Text>
                                        {apala.remedies && apala.remedies.length > 0 && (
                                          <View style={styles.marakaRemediesBox}>
                                            <Text style={styles.marakaRemediesTitle}>
                                              {language === 'si' ? '💡 මඟ පෙන්වීම්' : '💡 Guidance'}
                                            </Text>
                                            {apala.remedies.map(function(r, ri) {
                                              return (
                                                <View key={ri} style={styles.marakaRemedyRow}>
                                                  <Text style={styles.marakaRemedyBullet}>•</Text>
                                                  <Text style={styles.marakaRemedyText}>
                                                    {language === 'si' ? r.si : r.en}
                                                  </Text>
                                                </View>
                                              );
                                            })}
                                          </View>
                                        )}
                                      </Animated.View>
                                    )}
                                    {!isExpanded && (
                                      <Text style={styles.marakaTapHint}>
                                        {language === 'si' ? '↓ විස්තර බලන්න මෙතන ඔබන්න' : '↓ Tap for details'}
                                      </Text>
                                    )}
                                  </View>
                                </View>
                              </Animated.View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    {/* Safe message when no active or upcoming */}
                    {marakaData.status === 'SAFE' && (!marakaData.upcomingApala || marakaData.upcomingApala.length === 0) && (
                      <View style={[styles.advCard, { alignItems: 'center', paddingVertical: 20 }]}>
                        <Ionicons name="shield-checkmark" size={32} color="#10b981" />
                        <Text style={{ color: '#10b981', fontWeight: '700', fontSize: 15, marginTop: 8 }}>
                          {language === 'si' ? 'හොඳ කාලයයි' : 'You\'re in a Clear Period'}
                        </Text>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                          {language === 'si' ? 'ඉදිරියේදී දැනට සංවේදී කාලයක් නැහැ' : 'No sensitive periods ahead — a favorable time'}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : null}
              </Animated.View>
            )}

            {/* ── ENGINE FOOTER ── */}
            <Animated.View entering={FadeIn.delay(800).duration(400)}>
              <Text style={styles.engineFooter}>
                {chartData.advancedAnalysis.engineVersion} • {chartData.advancedAnalysis.computeTimeMs}ms
              </Text>
            </Animated.View>

          </View>
        )}
      </View>
    );
  };

  return (
    <DesktopScreenWrapper routeName="kendara">
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <CosmicBackground reduced={reduced} lowEnd={lowEnd} />
      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={sc.iconAccent} />}>
        <View style={[styles.content, isDesktop && styles.contentDesktop, !isDesktop && { paddingTop: insets.contentTop }]}>
          <Animated.View entering={FadeIn.duration(700)} style={styles.pageTitleRow}>
            <View>
              <Text style={[styles.pageTitle, { color: sc.iconAccent }]}>
                {language === 'si' ? 'මගේ ජීවිත සිතියම' : 'My Life Map'}
              </Text>
              <Text style={[styles.pageSubtitle, { color: sc.labelColor }]}>
                {user && user.birthData && user.birthData.dateTime
                  ? (function() {
                      var dt = String(user.birthData.dateTime);
                      var dateMatch = dt.match(/^(\d{4})-(\d{2})-(\d{2})/);
                      var dateStr = dateMatch ? dateMatch[3] + '/' + dateMatch[2] + '/' + dateMatch[1] : new Date(dt).toLocaleDateString();
                      return dateStr + '  ' + formatBirthTime(dt);
                    })()
                  : ''}
              </Text>
            </View>
            {user?.birthData && (
              <View style={styles.lagnaOrb}>
                <LinearGradient colors={gradients.orangeButton} style={StyleSheet.absoluteFill} />
                <Ionicons name="planet" size={22} color={sc.iconAccent} />
              </View>
            )}
          </Animated.View>
          {renderContent()}
        </View>
        <View style={{ height: isDesktop ? 32 : insets.contentBottom }} />
      </ScrollView>
    </View>
    </DesktopScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 100 : 80 },
  contentDesktop: { paddingTop: 20, paddingHorizontal: 28, maxWidth: 900, alignSelf: 'center', width: '100%' },
  pageTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  pageTitle: { fontSize: 30, fontWeight: '800', color: '#FFB800', marginBottom: 3, ...textShadow('rgba(255,184,0,0.3)', { width: 0, height: 2 }, 8) },
  pageSubtitle: { fontSize: 13, color: 'rgba(255,214,102,0.50)', fontWeight: '500' },
  lagnaOrb: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,184,0,0.35)', ...boxShadow('#FF8C00', { width: 0, height: 0 }, 0.5, 10) },
  center: { alignItems: 'center', justifyContent: 'center', height: 300 },
  emptyState: { alignItems: 'center', padding: 40, backgroundColor: 'rgba(255,140,0,0.07)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,140,0,0.2)' },
  emptyTitle: { color: '#FFB800', fontSize: 18, marginVertical: 16, fontWeight: '700' },
  emptyText: { color: 'rgba(255,214,102,0.45)', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  actionButton: { backgroundColor: '#FFB800', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  actionButtonText: { fontWeight: '800', color: '#1A1040' },
  errorText: { color: '#F87171', fontSize: 14 },
  chartContainer: { marginBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { color: '#FFE8B0', fontSize: 17, marginLeft: 10, fontWeight: '700', flex: 1, ...textShadow('rgba(255,184,0,0.20)', { width: 0, height: 1 }, 6) },
  detailsCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', padding: 16, borderRadius: 18, marginTop: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    ...boxShadow('#FF8C00', { width: 0, height: 2 }, 0.1, 8),
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  infoLabel: { color: 'rgba(255,214,102,0.50)', fontSize: 13 },
  infoValue: { color: '#FFE8B0', fontWeight: '600', fontSize: 13 },
  cardTitle: { color: '#FFB800', marginBottom: 14, fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardIntro: { color: 'rgba(255,214,102,0.52)', fontSize: 12, lineHeight: 19, marginBottom: 14 },
  summaryItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  summaryIcon: {
    width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  summaryLabel: { color: 'rgba(255,214,102,0.45)', fontSize: 11, fontWeight: '700', marginBottom: 3 },
  summaryValue: { color: '#FFE8B0', fontSize: 13, lineHeight: 20, fontWeight: '600' },

  // Planet Positions — bar style
  planetRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)', gap: 10 },
  planetDot: { width: 9, height: 9, borderRadius: 5, marginTop: 6 },
  planetTextWrap: { flex: 1, gap: 5 },
  planetTopLine: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  planetName: { fontSize: 13, fontWeight: '800', flex: 1, lineHeight: 19 },
  planetDegree: { color: 'rgba(255,214,102,0.36)', fontSize: 11, fontWeight: '700', marginTop: 2 },
  planetBarTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginTop: 2 },
  planetBarFill: { height: 4, borderRadius: 2, opacity: 0.7 },
  planetRashi: { color: 'rgba(255,214,102,0.58)', fontSize: 12, fontWeight: '600', lineHeight: 18 },
  planetPersonalNote: { color: 'rgba(255,255,255,0.56)', fontSize: 11, lineHeight: 17, fontWeight: '500' },

  // Advanced Analysis styles
  advCard: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 16, overflow: 'hidden',
  },
  countBadge: {
    backgroundColor: 'rgba(255,184,0,0.15)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: 'rgba(255,184,0,0.3)',
  },
  countText: { color: '#FFB800', fontSize: 12, fontWeight: '800' },

  // Dosha styles
  doshaRow: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  doshaDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  doshaName: { color: '#FFE8B0', fontSize: 14, fontWeight: '700' },
  doshaMeta: { color: 'rgba(255,214,102,0.38)', fontSize: 10, lineHeight: 15, fontWeight: '700', marginTop: 4 },
  doshaIssueMeaning: { color: 'rgba(255,255,255,0.58)', fontSize: 12, lineHeight: 18, marginTop: 5 },
  doshaGuidanceTitle: { color: '#FBBF24', fontSize: 12, lineHeight: 18, fontWeight: '800', marginTop: 8 },
  doshaDesc: { color: 'rgba(255,214,102,0.40)', fontSize: 12, lineHeight: 18, marginTop: 3 },
  cancelBadge: { backgroundColor: 'rgba(52,211,153,0.15)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(52,211,153,0.3)' },
  cancelText: { color: '#34D399', fontSize: 9, fontWeight: '800' },
  cancelReason: { color: 'rgba(52,211,153,0.6)', fontSize: 11, fontStyle: 'italic', marginTop: 3 },
  cancelInfoBox: { marginTop: 9, padding: 9, borderRadius: 10, backgroundColor: 'rgba(52,211,153,0.08)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.16)' },
  cancelInfoLabel: { color: '#34D399', fontSize: 10, fontWeight: '900', marginBottom: 4 },
  cancelInfoText: { color: 'rgba(209,250,229,0.72)', fontSize: 11, lineHeight: 17, fontWeight: '600' },
  sevBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
  sevText: { fontSize: 9, fontWeight: '800' },

  // Yoga styles
  yogaItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  yogaTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  yogaName: { color: '#FFE8B0', fontSize: 14, fontWeight: '700', flex: 1 },
  yogaCat: { color: 'rgba(255,140,0,0.6)', fontSize: 11, fontWeight: '600', marginTop: 3 },
  yogaDesc: { color: 'rgba(255,214,102,0.40)', fontSize: 12, lineHeight: 18, marginTop: 3 },
  yogaPlanets: { color: 'rgba(255,184,0,0.6)', fontSize: 11, marginTop: 4 },
  strBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  strText: { fontSize: 10, fontWeight: '700' },

  // Jaimini styles
  jaiminiHighlight: { borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,140,0,0.15)', overflow: 'hidden' },
  jaiminiLabel: { color: 'rgba(255,140,0,0.7)', fontSize: 11, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  jaiminiValue: { color: '#FF8C00', fontSize: 22, fontWeight: '900' },
  jaiminiSub: { color: 'rgba(255,214,102,0.35)', fontSize: 11, marginTop: 8, lineHeight: 18 },
  jaiminiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  jaiminiMini: { flex: 1, minWidth: 90, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 10, alignItems: 'center' },
  jmLabel: { color: 'rgba(255,214,102,0.35)', fontSize: 10, fontWeight: '600', marginBottom: 4, textAlign: 'center' },
  jmValue: { color: '#FFE8B0', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  jmDesc: { color: 'rgba(255,214,102,0.30)', fontSize: 10, textAlign: 'center', marginTop: 4 },

  // Shadbala styles
  sbRow: { marginBottom: 14 },
  sbTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  sbPlanet: { fontSize: 14, fontWeight: '800', flex: 1, lineHeight: 18 },
  sbRupas: { color: 'rgba(255,214,102,0.50)', fontSize: 12, fontWeight: '700', minWidth: 42, textAlign: 'right' },
  sbBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  sbBarTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  sbBarFill: { height: 6, borderRadius: 3 },
  sbNote: { color: 'rgba(255,255,255,0.54)', fontSize: 11, lineHeight: 17, marginTop: 7 },

  // Bhrigu Bindu styles
  bbCircle: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: 'rgba(255,184,0,0.35)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,184,0,0.06)' },
  bbDeg: { color: '#FFB800', fontSize: 16, fontWeight: '800' },
  bbRashi: { color: '#FFE8B0', fontSize: 16, fontWeight: '700' },
  bbNak: { color: 'rgba(255,214,102,0.40)', fontSize: 12, marginTop: 2 },
  bbInterp: { color: 'rgba(255,214,102,0.40)', fontSize: 12, lineHeight: 18, marginTop: 12 },
  bbPersonalNote: { color: 'rgba(255,255,255,0.58)', fontSize: 12, lineHeight: 18, marginTop: 10, fontWeight: '500' },

  // Past Life styles
  plRow: { marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  plLabel: { color: 'rgba(167,139,250,0.7)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  plValue: { color: '#FFE8B0', fontSize: 13, lineHeight: 20 },
  plIndicator: { color: 'rgba(255,214,102,0.35)', fontSize: 12, lineHeight: 20, paddingLeft: 4 },

  // Engine footer
  engineFooter: { color: 'rgba(255,255,255,0.12)', fontSize: 10, textAlign: 'center', marginTop: 4, marginBottom: 10 },

  // AI explanation inline box
  aiExplainBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(255,184,0,0.05)',
    borderLeftWidth: 3, borderLeftColor: 'rgba(255,184,0,0.4)',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    marginHorizontal: 2, marginBottom: 10, marginTop: -4,
  },
  aiExplainText: { flex: 1, color: 'rgba(255,214,102,0.65)', fontSize: 13, lineHeight: 20, fontStyle: 'italic' },

  // Loading screen styles
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  loadingCard: { width: '100%', borderRadius: 24, padding: 28, borderWidth: 1, borderColor: 'rgba(255,184,0,0.15)', overflow: 'hidden' },
  loadingTitle: { color: '#FFB800', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 24, letterSpacing: 1 },
  stepsContainer: { gap: 6, marginBottom: 24 },
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, gap: 12 },
  stepRowActive: { backgroundColor: 'rgba(255,184,0,0.06)' },
  stepIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  stepIconDone: { backgroundColor: 'rgba(52,211,153,0.12)', borderColor: 'rgba(52,211,153,0.3)' },
  stepIconActive: { backgroundColor: 'rgba(255,184,0,0.1)', borderColor: 'rgba(255,184,0,0.3)' },
  stepText: { fontSize: 14, fontWeight: '500', flex: 1 },
  stepTextDone: { color: 'rgba(52,211,153,0.7)' },
  stepTextActive: { color: '#FFB800', fontWeight: '700' },
  stepTextPending: { color: 'rgba(255,255,255,0.22)' },
  loadingBarTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  loadingBarFill: { height: 4, backgroundColor: '#FFB800', borderRadius: 2 },

  // ── Maraka Apala styles ──
  marakaStatusOrb: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  marakaStatusTitle: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  marakaStatusDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 18 },
  marakaCountRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  marakaCountBadge: {
    flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  marakaCountNum: { color: '#f87171', fontSize: 20, fontWeight: '900' },
  marakaCountLabel: { color: 'rgba(248,113,113,0.7)', fontSize: 10, fontWeight: '600', marginTop: 2 },
  marakaSubHeader: {
    color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700',
    marginBottom: 8, marginTop: 4, letterSpacing: 0.3,
  },
  marakaApalaCard: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderLeftWidth: 3, marginBottom: 8,
  },
  marakaSevDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  marakaApalaTitle: { color: '#FFE8B0', fontSize: 14, fontWeight: '700', flexShrink: 1 },
  marakaSevBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
  marakaSevText: { fontSize: 9, fontWeight: '800' },
  marakaApalaDesc: { color: 'rgba(255,214,102,0.40)', fontSize: 12, lineHeight: 18, marginTop: 4 },
  marakaPeriodRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  marakaPeriodText: { color: 'rgba(255,214,102,0.40)', fontSize: 11, fontWeight: '500' },
  marakaDaysLeftBadge: { backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  marakaDaysLeftText: { color: 'rgba(248,113,113,0.8)', fontSize: 10, fontWeight: '700' },
  marakaRemediesBox: {
    backgroundColor: 'rgba(16,185,129,0.05)', borderRadius: 10, padding: 12,
    marginTop: 10, borderWidth: 1, borderColor: 'rgba(16,185,129,0.15)',
  },
  marakaRemediesTitle: { color: '#10b981', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  marakaRemedyRow: { flexDirection: 'row', gap: 6, marginBottom: 4, paddingLeft: 2 },
  marakaRemedyBullet: { color: 'rgba(16,185,129,0.6)', fontSize: 12, fontWeight: '700' },
  marakaRemedyText: { color: 'rgba(255,255,255,0.55)', fontSize: 12, lineHeight: 18, flex: 1 },
  marakaTapHint: { color: 'rgba(255,255,255,0.2)', fontSize: 10, marginTop: 6, fontStyle: 'italic' },
  
});

// ── Kendara Jyotish Styles ──
var kj = StyleSheet.create({
  // Dasha Timeline
  currentDashaBox: {
    borderRadius: 14, overflow: 'hidden', padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(255,140,0,0.20)',
  },
  currentDashaHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  currentDashaDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFB800' },
  currentDashaLabel: { color: 'rgba(255,184,0,0.60)', fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  currentDashaPlanet: { color: '#FFB800', fontSize: 22, fontWeight: '900' },
  currentDashaSub: { color: 'rgba(255,214,102,0.45)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  currentDashaNote: { color: 'rgba(255,255,255,0.58)', fontSize: 12, lineHeight: 18, marginTop: 8, fontWeight: '500' },

  dashaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  dashaRowCurrent: { backgroundColor: 'rgba(255,184,0,0.04)', borderRadius: 10, marginHorizontal: -6, paddingHorizontal: 6 },
  dashaLeft: { width: 56, alignItems: 'flex-end' },
  dashaPlanet: { fontSize: 13, fontWeight: '800' },
  dashaYears: { color: 'rgba(255,214,102,0.35)', fontSize: 9, fontWeight: '600' },
  dashaBarWrap: { flex: 1 },
  dashaBarTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', marginBottom: 3 },
  dashaBarFill: { height: 6, borderRadius: 3 },
  dashaDate: { color: 'rgba(255,214,102,0.30)', fontSize: 9, fontWeight: '500' },
  dashaLive: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFB800' },

  // Dosha/Sade Sati
  doshaOrb: {
    width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  doshaStatus: { fontSize: 15, fontWeight: '800', marginBottom: 3 },
  doshaDesc: { color: 'rgba(255,214,102,0.45)', fontSize: 12, lineHeight: 18 },

  // Chalit shifts
  chalitDesc: { color: 'rgba(255,214,102,0.40)', fontSize: 12, lineHeight: 18, marginBottom: 10 },
  chalitRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  chalitDot: { width: 8, height: 8, borderRadius: 4 },
  chalitPlanet: { fontSize: 13, fontWeight: '700', width: 60 },
  chalitShiftBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(129,140,248,0.10)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(129,140,248,0.20)',
  },
  chalitShiftFrom: { color: 'rgba(255,255,255,0.50)', fontSize: 12, fontWeight: '700' },
  chalitShiftTo: { color: '#818CF8', fontSize: 12, fontWeight: '800' },
  chalitLabel: { color: 'rgba(129,140,248,0.50)', fontSize: 10, fontWeight: '600', flex: 1, textAlign: 'right' },

  // Varga picker
  vargaPickerRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  vargaPill: {
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', overflow: 'hidden', minWidth: 70,
  },
  vargaPillActive: { borderColor: 'rgba(6,182,212,0.40)' },
  vargaPillLabel: { color: 'rgba(255,214,102,0.50)', fontSize: 14, fontWeight: '900' },
  vargaPillLabelActive: { color: '#06B6D4' },
  vargaPillName: { color: 'rgba(255,214,102,0.30)', fontSize: 9, fontWeight: '600', marginTop: 2 },
  vargaPillNameActive: { color: 'rgba(6,182,212,0.65)' },

  // Varga chart display
  vargaAscRow: {
    gap: 4,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(6,182,212,0.15)',
    marginBottom: 4,
  },
  vargaAscLabel: { color: 'rgba(6,182,212,0.60)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  vargaAscValue: { color: '#06B6D4', fontSize: 14, lineHeight: 20, fontWeight: '800' },
  vargaPlanetRow: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)', gap: 5 },
  vargaPlanetTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  vargaPlanetName: { fontSize: 13, fontWeight: '800', lineHeight: 19 },
  vargaPlanetHint: { color: 'rgba(255,255,255,0.38)', fontSize: 11, lineHeight: 16, marginLeft: 16 },
  vargaPlanetRashi: {
    color: '#06B6D4', fontSize: 11, fontWeight: '800', textAlign: 'right', marginLeft: 8,
    backgroundColor: 'rgba(6,182,212,0.08)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3,
    overflow: 'hidden', maxWidth: 90,
  },
  vargaPlanetPlacement: { color: 'rgba(255,214,102,0.58)', fontSize: 12, lineHeight: 18, fontWeight: '600', marginLeft: 16 },
});
