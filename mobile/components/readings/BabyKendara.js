/**
 * BabyKendara — the Baby Kendara Pack BODY (no screen chrome).
 *
 * Rendered in two places:
 *   1. Inline in the Reports tab (reading switcher — no navigation).
 *   2. Inside app/(tabs)/baby.js as a standalone screen (Home entry).
 *
 * Flow:
 *   Enter the baby's birth details →
 *   Free   : lagna + nakshatra reveal + the full list of PAID sections as
 *            named locks (kendara-page pattern).
 *   Paid   : staged cosmic loading screen → the complete keepsake report
 *            (chart, planets, star profile, naming letters + Sinhala name
 *            ideas, dosha checks + remedies, element balance, lucky picks,
 *            childhood dasha timeline, naming + first-feeding nekath dates).
 *
 * Consumes `data.report` from POST /api/baby/compose (engine/babyReport.js);
 * falls back to the legacy keys if an old server ever answers.
 *
 * No emoji icons — Ionicons only.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn, FadeInDown, FadeInUp,
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withSequence, withDelay,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DatePickerField, TimePickerField } from '../CosmicDateTimePicker';
import CitySearchPicker from '../CitySearchPicker';
import SriLankanChart from '../SriLankanChart';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

// ══════════════════════════════════════════
//  Formatting helpers
// ══════════════════════════════════════════

var MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var MONTHS_SI = ['ජන', 'පෙබ', 'මාර්', 'අප්‍රේ', 'මැයි', 'ජූනි', 'ජූලි', 'අගෝ', 'සැප්', 'ඔක්', 'නොවැ', 'දෙසැ'];

function fmtLocalDate(dateStr, si) {
  // dateStr: 'YYYY-MM-DD'
  if (!dateStr) return '';
  try {
    var parts = dateStr.split('-');
    var y = parts[0], m = parseInt(parts[1], 10) - 1, d = parseInt(parts[2], 10);
    var months = si ? MONTHS_SI : MONTHS_EN;
    return d + ' ' + (months[m] || '') + ' ' + y;
  } catch (e) { return dateStr; }
}

function fmtTime12(hhmm, si) {
  if (!hhmm) return '';
  try {
    var parts = hhmm.split(':');
    var h = parseInt(parts[0], 10);
    var m = parts[1] || '00';
    var am = h < 12;
    var h12 = h % 12 || 12;
    var suffix = si ? (am ? 'පෙ.ව.' : 'ප.ව.') : (am ? 'AM' : 'PM');
    return si ? (suffix + ' ' + h12 + ':' + m) : (h12 + ':' + m + ' ' + suffix);
  } catch (e) { return hhmm; }
}

function qualityMeta(score, si) {
  if (score >= 80) return { label: si ? 'විශිෂ්ට' : 'Excellent', color: '#F9D77E', bg: 'rgba(249,215,126,0.14)' };
  if (score >= 65) return { label: si ? 'ඉතා හොඳ' : 'Very good', color: '#86EFAC', bg: 'rgba(134,239,172,0.13)' };
  return { label: si ? 'හොඳ' : 'Good', color: '#93C5FD', bg: 'rgba(147,197,253,0.13)' };
}

var ELEMENT_COLORS = { fire: '#F87171', earth: '#FBBF24', air: '#93C5FD', water: '#67E8F9' };
var ELEMENT_ICONS = { fire: 'flame-outline', earth: 'leaf-outline', air: 'cloud-outline', water: 'water-outline' };

// ══════════════════════════════════════════
//  Staged loading screen
// ══════════════════════════════════════════

var STAGES = [
  { icon: 'time-outline', si: 'උපන් මොහොත කියවමින්...', sub_si: 'දිනය, වේලාව සහ ස්ථානය අනුව අහස ගණනය කරමින්', en: 'Reading the birth moment...', sub_en: 'Computing the sky for the date, time and place' },
  { icon: 'planet-outline', si: 'ග්‍රහ පිහිටීම් සටහන් කරමින්...', sub_si: 'ග්‍රහයන් 9ම රාශි අනුව කේන්දරයට එක් කරමින්', en: 'Placing the nine grahas...', sub_en: 'Mapping every planet into the chart' },
  { icon: 'star-outline', si: 'නැකත හා ස්වභාවය හඳුනා ගනිමින්...', sub_si: 'බිලිඳාගේ ගණය, යෝනිය සහ ගති ලක්ෂණ විමසමින්', en: 'Reading the birth star...', sub_en: "Studying the baby's gana, yoni and nature" },
  { icon: 'text-outline', si: 'සුබ නාම අකුරු සොයමින්...', sub_si: 'අවකහඩ චක්‍රයෙන් නමට හිමි අකුරු තෝරමින්', en: 'Finding the naming letters...', sub_en: 'Picking the letters from the avakahada chart' },
  { icon: 'shield-checkmark-outline', si: 'දෝෂ පරීක්ෂා කරමින්...', sub_si: 'ගණ්ඩ මූල සහ ගණ්ඩාන්ත දෝෂ දෙකම බලමින්', en: 'Checking the doshas...', sub_en: 'Testing both Ganda Moola and Gandanta' },
  { icon: 'calendar-outline', si: 'සුබ නැකැත් දින තෝරමින්...', sub_si: 'නම් තැබීමට හා ඉඳුල් කට ගෑමට හොඳම දින සොයමින්', en: 'Choosing auspicious dates...', sub_en: 'Scanning the calendar for naming and first feeding' },
];

function BabyLoader({ si, stage }) {
  var spin = useSharedValue(0);
  var spin2 = useSharedValue(0);
  var pulse = useSharedValue(0.4);
  var tw1 = useSharedValue(0.2);
  var tw2 = useSharedValue(0.2);
  var tw3 = useSharedValue(0.2);
  var progress = useSharedValue(4);

  useEffect(function () {
    spin.value = withRepeat(withTiming(360, { duration: 9000 }), -1, false);
    spin2.value = withRepeat(withTiming(360, { duration: 5000 }), -1, false);
    pulse.value = withRepeat(withSequence(withTiming(0.9, { duration: 1300 }), withTiming(0.35, { duration: 1300 })), -1, true);
    tw1.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.15, { duration: 900 })), -1, true);
    tw2.value = withDelay(400, withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0.2, { duration: 700 })), -1, true));
    tw3.value = withDelay(800, withRepeat(withSequence(withTiming(1, { duration: 800 }), withTiming(0.15, { duration: 1000 })), -1, true));
  }, []);

  useEffect(function () {
    var pct = Math.min(((stage + 1) / STAGES.length) * 100, 97);
    progress.value = withTiming(pct, { duration: 700 });
  }, [stage]);

  var glowStyle = useAnimatedStyle(function () { return { opacity: pulse.value }; });
  var orbit1 = useAnimatedStyle(function () {
    return { transform: [{ rotate: spin.value + 'deg' }, { translateX: 58 }, { rotate: (-spin.value) + 'deg' }] };
  });
  var orbit2 = useAnimatedStyle(function () {
    return { transform: [{ rotate: (-spin2.value) + 'deg' }, { translateX: 82 }, { rotate: spin2.value + 'deg' }] };
  });
  var t1s = useAnimatedStyle(function () { return { opacity: tw1.value }; });
  var t2s = useAnimatedStyle(function () { return { opacity: tw2.value }; });
  var t3s = useAnimatedStyle(function () { return { opacity: tw3.value }; });
  var barStyle = useAnimatedStyle(function () { return { width: progress.value + '%' }; });

  var current = STAGES[Math.min(stage, STAGES.length - 1)];

  return (
    <Animated.View entering={FadeIn.duration(400)} style={st.loaderWrap}>
      {/* Orbit system */}
      <View style={st.loaderOrbitBox}>
        <Animated.View style={[st.loaderGlow, glowStyle]} />
        <View style={[st.loaderRing, { width: 116, height: 116 }]} />
        <View style={[st.loaderRing, { width: 164, height: 164 }]} />
        <LinearGradient colors={['#F9A8D4', '#EC4899']} style={st.loaderCore} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Ionicons name="happy-outline" size={26} color="#3A0A25" />
        </LinearGradient>
        <Animated.View style={[st.loaderPlanet, orbit1]}>
          <Ionicons name="moon" size={15} color="#C9CCD6" />
        </Animated.View>
        <Animated.View style={[st.loaderPlanet, orbit2]}>
          <Ionicons name="star" size={12} color="#F9D77E" />
        </Animated.View>
        <Animated.View style={[st.loaderTwinkle, { top: 6, left: 26 }, t1s]}>
          <Ionicons name="sparkles" size={11} color="#F9A8D4" />
        </Animated.View>
        <Animated.View style={[st.loaderTwinkle, { top: 30, right: 12 }, t2s]}>
          <Ionicons name="star" size={9} color="#FDE68A" />
        </Animated.View>
        <Animated.View style={[st.loaderTwinkle, { bottom: 10, left: 44 }, t3s]}>
          <Ionicons name="star" size={8} color="#93C5FD" />
        </Animated.View>
      </View>

      {/* Current stage headline (crossfades on change) */}
      <Animated.View key={'stg-' + stage} entering={FadeIn.duration(450)} style={{ alignItems: 'center', marginBottom: 14 }}>
        <Text style={st.loaderTitle}>{si ? current.si : current.en}</Text>
        <Text style={st.loaderSub}>{si ? current.sub_si : current.sub_en}</Text>
      </Animated.View>

      {/* Stage checklist */}
      <View style={st.loaderList}>
        {STAGES.map(function (s, i) {
          var done = i < stage;
          var active = i === stage;
          return (
            <View key={i} style={st.loaderRow}>
              {done ? (
                <Ionicons name="checkmark-circle" size={16} color="#F9D77E" />
              ) : active ? (
                <ActivityIndicator size={14} color="#F472B6" style={{ width: 16, height: 16 }} />
              ) : (
                <Ionicons name="ellipse-outline" size={15} color="rgba(255,255,255,0.18)" />
              )}
              <Ionicons name={s.icon} size={13} color={done ? '#F9D77E' : active ? '#F9A8D4' : 'rgba(255,255,255,0.28)'} />
              <Text style={[st.loaderRowText, done && { color: 'rgba(249,215,126,0.9)' }, active && { color: '#FFF1F8', fontWeight: '800' }]} numberOfLines={1}>
                {(si ? s.si : s.en).replace('...', '')}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Progress */}
      <View style={st.loaderBarTrack}>
        <Animated.View style={[st.loaderBarFillWrap, barStyle]}>
          <LinearGradient colors={['#F9A8D4', '#EC4899']} style={{ flex: 1 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
        </Animated.View>
      </View>
      <Text style={st.loaderHint}>{si ? 'බිලිඳාගේ සම්පූර්ණ වාර්තාව සකසමින් — මොහොතක් ඉන්න' : 'Preparing the full keepsake — one moment'}</Text>
    </Animated.View>
  );
}

// ══════════════════════════════════════════
//  Section primitives
// ══════════════════════════════════════════

function SectionCard({ icon, title, sub, children, delay, tint }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay || 0).duration(450)} style={[st.section, tint ? { borderColor: tint } : null]}>
      <View style={st.sectionHead}>
        <View style={st.sectionIconBox}>
          <Ionicons name={icon} size={15} color="#F9A8D4" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.sectionTitle}>{title}</Text>
          {sub ? <Text style={st.sectionSub}>{sub}</Text> : null}
        </View>
      </View>
      {children}
    </Animated.View>
  );
}

function InfoNote({ text }) {
  return (
    <View style={st.infoNote}>
      <Ionicons name="information-circle-outline" size={13} color="rgba(249,198,214,0.6)" style={{ marginTop: 1 }} />
      <Text style={st.infoNoteText}>{text}</Text>
    </View>
  );
}

// ══════════════════════════════════════════
//  Report sections
// ══════════════════════════════════════════

function KeepsakeHero({ identity, report, si }) {
  var bm = report && report.birthMoment;
  var lagna = identity && identity.lagna;
  var nak = identity && identity.nakshatra;
  var star = report && report.starProfile;

  return (
    <Animated.View entering={FadeInUp.duration(500)}>
      <LinearGradient colors={['rgba(244,114,182,0.22)', 'rgba(147,51,134,0.10)', 'rgba(255,255,255,0.03)']} style={st.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={st.heroBadge}>
          <Ionicons name="ribbon-outline" size={12} color="#F9D77E" />
          <Text style={st.heroBadgeText}>{si ? 'බිලිඳු කේන්දර වාර්තාව' : 'BABY KENDARA REPORT'}</Text>
        </View>

        {bm ? (
          <Text style={st.heroBirthLine}>
            {fmtLocalDate(bm.localDate, si) + '  ·  ' + fmtTime12(bm.localTime, si) + '  ·  ' + (si ? bm.weekday.si : bm.weekday.en)}
          </Text>
        ) : null}
        {bm && bm.tithi ? (
          <Text style={st.heroTithi}>{si ? bm.tithi.sinhala : (bm.tithi.name || '')}</Text>
        ) : null}

        <View style={st.heroIdRow}>
          <View style={st.heroIdCol}>
            <Text style={st.heroIdLabel}>{si ? 'ලග්නය' : 'LAGNA'}</Text>
            <Text style={st.heroIdVal} numberOfLines={1} adjustsFontSizeToFit>
              {lagna ? (si ? (lagna.sinhala || lagna.english) : lagna.english) : '—'}
            </Text>
          </View>
          <View style={st.heroDivider} />
          <View style={st.heroIdCol}>
            <Text style={st.heroIdLabel}>{si ? 'නැකත' : 'NAKSHATRA'}</Text>
            <Text style={st.heroIdVal} numberOfLines={1} adjustsFontSizeToFit>
              {nak ? ((si ? (nak.sinhala || nak.name) : nak.name) + (nak.pada ? '  ·  ' + nak.pada : '')) : '—'}
            </Text>
            {nak && nak.pada ? <Text style={st.heroIdMini}>{si ? nak.pada + ' වන පාදය' : 'pada ' + nak.pada}</Text> : null}
          </View>
          <View style={st.heroDivider} />
          <View style={st.heroIdCol}>
            <Text style={st.heroIdLabel}>{si ? 'චන්ද්‍ර රාශිය' : 'MOON SIGN'}</Text>
            <Text style={st.heroIdVal} numberOfLines={1} adjustsFontSizeToFit>
              {identity && identity.moonSign ? (si ? (identity.moonSign.sinhala || identity.moonSign.english) : identity.moonSign.english) : '—'}
            </Text>
          </View>
        </View>

        {star && star.gana ? (
          <View style={st.heroChipsRow}>
            <View style={st.heroChip}>
              <Ionicons name="flower-outline" size={11} color="#F9A8D4" />
              <Text style={st.heroChipText}>{si ? star.gana.si : star.gana.en}</Text>
            </View>
            {star.yoni ? (
              <View style={st.heroChip}>
                <Ionicons name="paw-outline" size={11} color="#F9A8D4" />
                <Text style={st.heroChipText}>{(si ? 'යෝනිය: ' : 'Yoni: ') + (si ? star.yoni.si : star.yoni.en)}</Text>
              </View>
            ) : null}
            {star.lord ? (
              <View style={st.heroChip}>
                <Ionicons name="planet-outline" size={11} color="#F9A8D4" />
                <Text style={st.heroChipText}>{(si ? 'නැකත් අධිපති: ' : 'Star lord: ') + (si ? star.lord.sinhala : star.lord.name)}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </LinearGradient>
    </Animated.View>
  );
}

function ChartSection({ identity, si, delay }) {
  if (!identity || !identity.rashiChart || !identity.lagna) return null;
  // D9 lagna sits under navamshaLagna.rashi.id; fall back to the D1 lagna so the
  // grid never mis-orients if the field is shaped differently.
  var navLagnaId = (identity.navamshaLagna && identity.navamshaLagna.rashi && identity.navamshaLagna.rashi.id)
    || (identity.navamshaLagna && identity.navamshaLagna.rashiId)
    || identity.lagna.rashiId || identity.lagna.id;
  return (
    <SectionCard icon="grid-outline" title={si ? 'උපන් කේන්දර සටහන' : 'Birth chart'} sub={si ? 'සාම්ප්‍රදායික ලංකා කේන්දර විලාසය' : 'Traditional Sri Lankan style'} delay={delay}>
      <View style={{ alignItems: 'center', marginTop: 6 }}>
        <SriLankanChart rashiChart={identity.rashiChart} lagnaRashiId={identity.lagna.rashiId || identity.lagna.id} language={si ? 'si' : 'en'} chartSize={280} />
      </View>
      {identity.navamshaChart ? (
        <View style={{ marginTop: 18 }}>
          <View style={st.d9Divider} />
          <Text style={st.d9Title}>{si ? 'නවාංශකය (D9)' : 'Navamsha (D9)'}</Text>
          <Text style={st.d9Sub}>{si ? 'දරුවාගේ ඇතුළාන්ත ස්වභාවය සහ ජීවිත ශක්තිය පෙන්වන ගැඹුරු කේන්දරය' : "The deeper chart — your baby's inner nature and life-strength"}</Text>
          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <SriLankanChart rashiChart={identity.navamshaChart} lagnaRashiId={navLagnaId} language={si ? 'si' : 'en'} chartSize={280} />
          </View>
          <Text style={st.d9Note}>{si ? 'පසුකාලීනව මේ කේන්දරයම විවාහ ජීවිතය හා සහකරු බැඳීම් ගැනද කියාපායි.' : 'In later life, this same chart also speaks to marriage and partnership.'}</Text>
        </View>
      ) : null}
    </SectionCard>
  );
}

function PlanetTable({ planets, si, delay }) {
  if (!planets || !planets.length) return null;
  return (
    <SectionCard icon="planet-outline" title={si ? 'ග්‍රහ පිහිටීම්' : 'Planetary positions'} sub={si ? 'උපන් මොහොතේ ග්‍රහයන් 9' : 'The nine grahas at birth'} delay={delay}>
      {planets.map(function (p, i) {
        return (
          <View key={p.key || i} style={[st.planetRow, i === planets.length - 1 && { borderBottomWidth: 0 }]}>
            <Text style={st.planetName}>{si ? p.sinhala : p.name}</Text>
            {p.retrograde ? (
              <View style={st.retroChip}><Text style={st.retroChipText}>{si ? 'වක්‍ර' : 'R'}</Text></View>
            ) : null}
            <Text style={st.planetRashi}>{si ? (p.rashiSinhala || p.rashi) : p.rashi}</Text>
            <Text style={st.planetDeg}>{p.degree != null ? p.degree + '°' : ''}</Text>
          </View>
        );
      })}
    </SectionCard>
  );
}

function StarProfile({ star, si, delay }) {
  if (!star) return null;
  var chips = [
    star.deity && (star.deity.si || star.deity.en) ? { icon: 'sunny-outline', label: (si ? 'අධිදේවතාව: ' : 'Deity: ') + (si ? star.deity.si : star.deity.en) } : null,
    star.symbol && (star.symbol.si || star.symbol.en) ? { icon: 'shapes-outline', label: (si ? 'සංකේතය: ' : 'Symbol: ') + (si ? star.symbol.si : star.symbol.en) } : null,
  ].filter(Boolean);

  return (
    <SectionCard icon="sparkles-outline" title={si ? 'බිලිඳාගේ ස්වභාවය' : "Baby's nature"} sub={(si ? (star.sinhala || star.name) : star.name) + (si ? ' නැකත අනුව' : ' nakshatra profile')} delay={delay}>
      {star.nature && (star.nature.si || star.nature.en) ? (
        <Text style={st.bodyText}>{si ? star.nature.si : star.nature.en}</Text>
      ) : null}
      {chips.length ? (
        <View style={st.chipWrapRow}>
          {chips.map(function (c, i) {
            return (
              <View key={i} style={st.softChip}>
                <Ionicons name={c.icon} size={11} color="#F9D77E" />
                <Text style={st.softChipText}>{c.label}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
      {star.gift && (star.gift.si || star.gift.en) ? (
        <View style={st.giftRow}>
          <Ionicons name="gift-outline" size={14} color="#F9D77E" style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={st.giftLabel}>{si ? 'උපතින් ලැබුණු තෑග්ග' : 'Born gift'}</Text>
            <Text style={st.giftText}>{si ? star.gift.si : star.gift.en}</Text>
          </View>
        </View>
      ) : null}
      {star.parentNote && (star.parentNote.si || star.parentNote.en) ? (
        <View style={st.parentNote}>
          <Ionicons name="heart-outline" size={13} color="#F9A8D4" style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={st.parentNoteLabel}>{si ? 'දෙමාපියන්ට' : 'For the parents'}</Text>
            <Text style={st.parentNoteText}>{si ? star.parentNote.si : star.parentNote.en}</Text>
          </View>
        </View>
      ) : null}
    </SectionCard>
  );
}

function NamingSection({ naming, si, delay }) {
  // Gender is mandatory, so default the name list to the baby's own gender.
  var [gender, setGender] = useState((naming && naming.defaultGender) || 'all');
  if (!naming || !naming.padas || !naming.padas.length) return null;

  var babyPada = naming.padas.find(function (p) { return p.isBabyPada; }) || naming.padas[0];
  var pool = babyPada.names || { male: [], female: [] };
  var shown = gender === 'male' ? pool.male : gender === 'female' ? pool.female : pool.male.concat(pool.female);
  var hasNames = (pool.male.length + pool.female.length) > 0;

  var filters = [
    { key: 'all', si: 'සියල්ල', en: 'All', icon: 'people-outline' },
    { key: 'male', si: 'පුතෙකුට', en: 'Boy', icon: 'male-outline' },
    { key: 'female', si: 'දුවෙකුට', en: 'Girl', icon: 'female-outline' },
  ];

  return (
    <SectionCard
      icon="text-outline"
      title={si ? 'සුබ නාම අකුරු' : 'Auspicious naming letters'}
      sub={si
        ? (naming.nakshatraSinhala || naming.nakshatra) + ' නැකතේ ' + naming.pada + ' වන පාදයට අනුව'
        : naming.nakshatra + ' nakshatra, pada ' + naming.pada}
      delay={delay}
    >
      {/* Hero letter */}
      {naming.letter ? (
        <View style={st.letterHeroRow}>
          <LinearGradient colors={['#F9A8D4', '#EC4899']} style={st.letterHero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={st.letterHeroText}>{naming.letter.si}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={st.letterHeroLabel}>{si ? 'නමේ මුල් අකුර' : 'The starting letter'}</Text>
            <Text style={st.letterHeroRoman}>{'“' + naming.letter.roman + '”'}</Text>
            <Text style={st.letterHeroHint}>{si ? 'මෙම ශබ්දයෙන් පටන් ගන්නා ඕනෑම නමක් සුබයි' : 'Any name starting with this sound is auspicious'}</Text>
          </View>
        </View>
      ) : null}

      {/* All 4 padas */}
      <Text style={st.miniHeading}>{si ? 'නැකතේ පාද හතරේම අකුරු' : 'Letters of all four padas'}</Text>
      <View style={st.padaRow}>
        {naming.padas.map(function (p) {
          return (
            <View key={p.pada} style={[st.padaChip, p.isBabyPada && st.padaChipActive]}>
              <Text style={[st.padaChipLetter, p.isBabyPada && { color: '#FFF1F8' }]}>{p.letter}</Text>
              <Text style={[st.padaChipLabel, p.isBabyPada && { color: 'rgba(255,241,248,0.75)' }]}>
                {(si ? 'පාදය ' : 'Pada ') + p.pada}
              </Text>
              {p.isBabyPada ? (
                <View style={st.padaStar}><Ionicons name="star" size={9} color="#3A0A25" /></View>
              ) : null}
            </View>
          );
        })}
      </View>

      {/* Name ideas */}
      {hasNames ? (
        <View style={{ marginTop: 14 }}>
          <Text style={st.miniHeading}>{si ? 'නම් අදහස් — ' + babyPada.letter + ' අකුරින්' : 'Name ideas with ' + (naming.letter ? naming.letter.roman : '')}</Text>
          <View style={st.genderRow}>
            {filters.map(function (f) {
              var active = gender === f.key;
              return (
                <TouchableOpacity key={f.key} onPress={function () { setGender(f.key); }} activeOpacity={0.8} style={[st.genderChip, active && st.genderChipActive]}>
                  <Ionicons name={f.icon} size={12} color={active ? '#3A0A25' : 'rgba(249,198,214,0.8)'} />
                  <Text style={[st.genderChipText, active && { color: '#3A0A25' }]}>{si ? f.si : f.en}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {shown.length ? (
            <View style={st.nameWrap}>
              {shown.map(function (n, i) {
                return (
                  <View key={i} style={st.nameChip}>
                    <Text style={st.nameChipSi}>{n.si}</Text>
                    <Text style={st.nameChipRo}>{n.ro}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={st.emptyNames}>{si ? 'මෙම වර්ගයට නම් අදහස් නැත — අකුර අනුව ඔබ කැමති නමක් තෝරන්න.' : 'No ideas for this filter — pick any name with the letter.'}</Text>
          )}
        </View>
      ) : (
        <InfoNote text={si ? naming.rareLetterNote.si : naming.rareLetterNote.en} />
      )}

      <InfoNote text={si ? naming.howItWorks.si : naming.howItWorks.en} />
    </SectionCard>
  );
}

function DoshaCard({ data, title, si }) {
  if (!data || !data.checked) return null;
  var present = data.present;
  return (
    <View style={[st.doshaCard, { borderColor: present ? 'rgba(252,211,77,0.35)' : 'rgba(134,239,172,0.28)' }]}>
      <View style={st.doshaHead}>
        <Ionicons name={present ? 'alert-circle-outline' : 'shield-checkmark-outline'} size={15} color={present ? '#FCD34D' : '#86EFAC'} />
        <Text style={st.doshaTitle}>{title}</Text>
        <View style={[st.doshaPill, { backgroundColor: present ? 'rgba(252,211,77,0.15)' : 'rgba(134,239,172,0.13)' }]}>
          <Text style={[st.doshaPillText, { color: present ? '#FCD34D' : '#86EFAC' }]}>
            {present ? (si ? 'ඇත' : 'Present') : (si ? 'නැත' : 'Clear')}
          </Text>
        </View>
      </View>
      {data.meaning ? <Text style={st.doshaMeaning}>{si ? data.meaning.si : data.meaning.en}</Text> : null}
      {data.verdict ? (
        <Text style={[st.doshaVerdict, { color: present ? '#FDE68A' : '#BBF7D0' }]}>{si ? data.verdict.si : data.verdict.en}</Text>
      ) : null}
      {present && data.severityLabel ? (
        <View style={st.severityRow}>
          <Ionicons name="pulse-outline" size={12} color="#FCD34D" />
          <Text style={st.severityText}>{si ? data.severityLabel.si : data.severityLabel.en}</Text>
        </View>
      ) : null}
      {present && data.remedies && data.remedies.length ? (
        <View style={{ marginTop: 8 }}>
          <Text style={st.miniHeading}>{si ? 'සම්ප්‍රදායික පිළියම්' : 'Traditional remedies'}</Text>
          {data.remedies.map(function (r, i) {
            var text = si ? (r.si || r.en) : (r.en || r.si);
            if (!text) return null;
            return (
              <View key={i} style={st.remedyRow}>
                <Ionicons name="checkmark-circle-outline" size={13} color="#F9D77E" style={{ marginTop: 2 }} />
                <Text style={st.remedyText}>{text}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function DoshaSection({ doshas, si, delay }) {
  if (!doshas) return null;
  return (
    <SectionCard icon="shield-checkmark-outline" title={si ? 'දෝෂ පරීක්ෂාව' : 'Dosha checks'} sub={si ? doshas.summary.si : doshas.summary.en} delay={delay}>
      <DoshaCard data={doshas.gandaMoola} title={si ? 'ගණ්ඩ මූල දෝෂය' : 'Ganda Moola'} si={si} />
      <DoshaCard data={doshas.gandanta} title={si ? 'ගණ්ඩාන්ත දෝෂය' : 'Gandanta'} si={si} />
    </SectionCard>
  );
}

function ElementsSection({ elements, si, delay }) {
  if (!elements || !elements.bars) return null;
  return (
    <SectionCard icon="flame-outline" title={si ? 'ධාතු සමතුලනය' : 'Element balance'} sub={si ? 'ග්‍රහයන් 9 බෙදී ඇති මූලද්‍රව්‍ය' : 'How the nine grahas spread across the elements'} delay={delay}>
      {elements.bars.map(function (b) {
        return (
          <View key={b.key} style={st.elementRow}>
            <View style={st.elementLabelBox}>
              <Ionicons name={ELEMENT_ICONS[b.key]} size={12} color={ELEMENT_COLORS[b.key]} />
              <Text style={st.elementLabel}>{si ? b.si : b.en}</Text>
            </View>
            <View style={st.elementTrack}>
              <View style={[st.elementFill, { width: Math.max(b.percent, 4) + '%', backgroundColor: ELEMENT_COLORS[b.key] }]} />
            </View>
            <Text style={st.elementPct}>{b.percent + '%'}</Text>
          </View>
        );
      })}
      {elements.dominant && elements.dominant.babyNote ? (
        <View style={st.parentNote}>
          <Ionicons name={ELEMENT_ICONS[elements.dominant.key]} size={13} color={ELEMENT_COLORS[elements.dominant.key]} style={{ marginTop: 2 }} />
          <Text style={[st.parentNoteText, { flex: 1 }]}>{si ? elements.dominant.babyNote.si : elements.dominant.babyNote.en}</Text>
        </View>
      ) : null}
    </SectionCard>
  );
}

function LuckySection({ lucky, si, delay }) {
  if (!lucky) return null;
  var items = [
    lucky.color ? { icon: 'color-palette-outline', label: si ? 'සුබ වර්ණ' : 'Lucky colours', value: lucky.color } : null,
    lucky.day ? { icon: 'sunny-outline', label: si ? 'සුබ දවස' : 'Lucky day', value: lucky.day } : null,
    lucky.gem ? { icon: 'diamond-outline', label: si ? 'සුබ මැණික' : 'Gemstone', value: lucky.gem } : null,
    lucky.guardianPlanet ? { icon: 'planet-outline', label: si ? 'ආරක්ෂක ග්‍රහයා' : 'Guardian planet', value: si ? lucky.guardianPlanet.sinhala : lucky.guardianPlanet.name } : null,
  ].filter(Boolean);
  if (!items.length) return null;

  return (
    <SectionCard icon="diamond-outline" title={si ? 'බිලිඳාට සුබ දේ' : 'Lucky picks'} delay={delay}>
      <View style={st.luckyGrid}>
        {items.map(function (it, i) {
          return (
            <View key={i} style={st.luckyCell}>
              <Ionicons name={it.icon} size={15} color="#F9D77E" />
              <Text style={st.luckyLabel}>{it.label}</Text>
              <Text style={st.luckyValue} numberOfLines={2}>{it.value}</Text>
            </View>
          );
        })}
      </View>
      {lucky.note ? <InfoNote text={si ? lucky.note.si : lucky.note.en} /> : null}
    </SectionCard>
  );
}

function DashaSection({ dashas, si, delay }) {
  if (!dashas || !dashas.length) return null;
  return (
    <SectionCard icon="trending-up-outline" title={si ? 'මුල් අවුරුදුවල ග්‍රහ කාල' : 'Early-years planetary periods'} sub={si ? 'විම්ශෝත්තරී දශා ක්‍රමයට' : 'Vimshottari dasha timeline'} delay={delay}>
      {dashas.map(function (d, i) {
        return (
          <View key={i} style={st.dashaRow}>
            <View style={st.dashaLeft}>
              <View style={st.dashaDot} />
              {i < dashas.length - 1 ? <View style={st.dashaLine} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: i < dashas.length - 1 ? 14 : 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={st.dashaLord}>{(si ? d.lordSinhala : d.lord) + (si ? ' දශාව' : ' period')}</Text>
                <View style={st.dashaAgePill}>
                  <Text style={st.dashaAgeText}>
                    {si
                      ? ('වයස ' + d.fromAge + '–' + d.toAge)
                      : ('age ' + d.fromAge + '–' + d.toAge)}
                  </Text>
                </View>
              </View>
              {d.note ? <Text style={st.dashaNote}>{si ? d.note.si : d.note.en}</Text> : null}
            </View>
          </View>
        );
      })}
    </SectionCard>
  );
}

function RiteList({ rite, si, emptyText }) {
  if (!rite || !rite.results || !rite.results.length) {
    return emptyText ? <Text style={st.emptyNames}>{emptyText}</Text> : null;
  }
  var bestISO = null;
  var bestScore = -1;
  rite.results.forEach(function (r) { if (r.score > bestScore) { bestScore = r.score; bestISO = r.dateISO; } });

  return (
    <View>
      {rite.results.map(function (r, i) {
        var q = qualityMeta(r.score || 0, si);
        var isBest = r.dateISO === bestISO;
        return (
          <View key={i} style={[st.riteCard, isBest && st.riteCardBest]}>
            <View style={st.riteDateBox}>
              <Text style={st.riteDay}>{(r.localDate || '').slice(8, 10)}</Text>
              <Text style={st.riteMon}>{fmtLocalDate(r.localDate, si).split(' ').slice(1).join(' ')}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={st.riteWeekday}>{si ? r.weekday.si : r.weekday.en}</Text>
                {isBest ? (
                  <View style={st.riteBestPill}>
                    <Ionicons name="medal-outline" size={10} color="#3A0A25" />
                    <Text style={st.riteBestText}>{si ? 'හොඳම' : 'BEST'}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={st.riteTime}>{(si ? 'උදෑසන වේලාව: ' : 'Time: ') + fmtTime12(r.localTime, si)}</Text>
              {r.why && r.why.length ? (
                <View style={st.riteWhyRow}>
                  {r.why.map(function (w, j) {
                    return (
                      <View key={j} style={st.riteWhyChip}>
                        <Ionicons name="checkmark" size={9} color="#86EFAC" />
                        <Text style={st.riteWhyText}>{si ? w.si : w.en}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>
            <View style={[st.riteScore, { backgroundColor: q.bg }]}>
              <Text style={[st.riteScoreNum, { color: q.color }]}>{r.score}</Text>
              <Text style={[st.riteScoreLabel, { color: q.color }]}>{q.label}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function RitesSection({ rites, si, delay }) {
  if (!rites || (!rites.naming && !rites.firstFeeding)) return null;
  return (
    <SectionCard icon="calendar-outline" title={si ? 'සුබ නැකැත් දින' : 'Auspicious dates'} sub={si ? 'බිලිඳාගේ කේන්දරයටම ගැළපූ දින' : "Tuned to this baby's own chart"} delay={delay}>
      {rites.naming ? (
        <View style={{ marginBottom: 4 }}>
          <Text style={st.miniHeading}>{si ? 'නම් තැබීමේ උත්සවයට' : 'Naming ceremony'}</Text>
          <RiteList rite={rites.naming} si={si} />
        </View>
      ) : null}
      {rites.firstFeeding ? (
        <View style={{ marginTop: 10 }}>
          <Text style={st.miniHeading}>{si ? 'ඉඳුල් කට ගෑමට (බත් කැවීම)' : 'First feeding (indul katha gaema)'}</Text>
          <Text style={st.riteIntro}>{si ? 'සම්ප්‍රදායට අනුව මාස 4–8 අතර කාලයේ.' : 'Traditionally between months 4–8.'}</Text>
          <RiteList rite={rites.firstFeeding} si={si} />
        </View>
      ) : null}
    </SectionCard>
  );
}

function ReportFooter({ identity, report, si, onShare, onReset }) {
  return (
    <Animated.View entering={FadeInDown.delay(650).duration(450)}>
      <TouchableOpacity activeOpacity={0.88} onPress={onShare}>
        <LinearGradient colors={['#F9A8D4', '#F472B6', '#EC4899']} style={st.shareBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Ionicons name="share-social-outline" size={16} color="#3A0A25" />
          <Text style={st.shareBtnText}>{si ? 'පවුලට බෙදාගන්න' : 'Share with the family'}</Text>
        </LinearGradient>
      </TouchableOpacity>
      <TouchableOpacity onPress={onReset} activeOpacity={0.8} style={st.resetBtn}>
        <Ionicons name="refresh-outline" size={13} color="rgba(249,198,214,0.7)" />
        <Text style={st.resetBtnText}>{si ? 'වෙනත් බිලිඳෙකුගේ විස්තර බලන්න' : 'Check another baby'}</Text>
      </TouchableOpacity>
      <Text style={st.disclaimer}>
        {si
          ? 'මෙම වාර්තාව සම්ප්‍රදායික ජ්‍යෝතිෂ ගණනයන් මත පදනම් වූ මතක සටහනකි. වෛද්‍ය හෝ නීතිමය උපදෙසක් නොවේ.'
          : 'This report is a keepsake based on traditional astrological calculation — not medical or legal advice.'}
      </Text>
    </Animated.View>
  );
}

// ══════════════════════════════════════════
//  Legacy fallback (old server payload)
// ══════════════════════════════════════════

function legacyNameList(babyNames) {
  var s = babyNames && babyNames.suggestions;
  if (!s) return [];
  if (Array.isArray(s)) {
    var out = [];
    s.forEach(function (entry) {
      if (typeof entry === 'string') { out.push(entry); return; }
      if (entry && Array.isArray(entry.names)) {
        entry.names.forEach(function (n) { out.push(typeof n === 'string' ? n : (n && n.name) || ''); });
      }
    });
    return out.filter(Boolean);
  }
  return [];
}

function LegacyPack({ pack, si }) {
  var names = legacyNameList(pack.babyNames);
  var dates = (pack.namingDates && pack.namingDates.results) || [];
  var sorted = dates.slice().sort(function (a, b) { return new Date(a.dateTime) - new Date(b.dateTime); });
  return (
    <View>
      {pack.babyNames ? (
        <SectionCard icon="text-outline" title={si ? 'සුබ නාම අකුරු' : 'Naming letters'} delay={100}>
          <Text style={st.bodyText}>{pack.babyNames.sinhalaNote || ''}</Text>
          {names.length ? (
            <View style={st.nameWrap}>
              {names.map(function (n, i) { return <View key={i} style={st.nameChip}><Text style={st.nameChipSi}>{n}</Text></View>; })}
            </View>
          ) : null}
        </SectionCard>
      ) : null}
      {pack.gandaMoola ? (
        <SectionCard icon="shield-checkmark-outline" title={si ? 'ගණ්ඩ මූල දෝෂය' : 'Ganda Moola'} delay={160}>
          <Text style={[st.doshaVerdict, { color: (pack.gandaMoola.hasDosha || pack.gandaMoola.hasGandaMoola) ? '#FDE68A' : '#BBF7D0' }]}>
            {(pack.gandaMoola.hasDosha || pack.gandaMoola.hasGandaMoola)
              ? (si ? 'ඇත — පිළියම් සඳහා ජ්‍යෝතිෂවේදියෙකු හමුවන්න.' : 'Present — consult an astrologer for remedies.')
              : (si ? 'නැත — බිලිඳා මෙම දෝෂයෙන් නිදහස්.' : 'Clear — the baby is free of this dosha.')}
          </Text>
        </SectionCard>
      ) : null}
      {sorted.length ? (
        <SectionCard icon="calendar-outline" title={si ? 'නම් තැබීමට සුබ දින' : 'Naming dates'} delay={220}>
          {sorted.map(function (d, i) {
            var iso = (d.dateTime || '').slice(0, 10);
            return (
              <View key={i} style={st.remedyRow}>
                <Ionicons name="checkmark-circle-outline" size={13} color="#F9D77E" />
                <Text style={st.remedyText}>{fmtLocalDate(iso, si)}</Text>
              </View>
            );
          })}
        </SectionCard>
      ) : null}
    </View>
  );
}

// ══════════════════════════════════════════
//  AI life-story (narrative) block
// ══════════════════════════════════════════

var AI_SECTIONS = [
  { key: 'yogaAnalysis', icon: 'ribbon-outline', si: 'ඔවුන් කවුද — චරිතය හා ශක්තීන්', en: 'Who They Are · Character' },
  { key: 'career', icon: 'briefcase-outline', si: 'දක්ෂතා හා වෘත්තීය මාවත', en: 'Talents & Vocation' },
  { key: 'education', icon: 'school-outline', si: 'අධ්‍යාපනය හා ඉගෙනුම', en: 'Education & Learning' },
  { key: 'familyPortrait', icon: 'people-outline', si: 'පවුල හා බැඳීම්', en: 'Family & Bonds' },
  { key: 'financial', icon: 'trending-up-outline', si: 'වාසනාව හා සමෘද්ධිය', en: 'Fortune & Prosperity' },
];

function narrativeText(section) {
  if (!section) return '';
  if (typeof section === 'string') return section;
  return section.narrative || section.content || section.text || '';
}

function AISectionCard({ meta, section, si, delay }) {
  var text = narrativeText(section);
  if (!text) return null;
  var paras = text.split(/\n\n+/).map(function (p) { return p.trim(); }).filter(Boolean);
  return (
    <SectionCard icon={meta.icon} title={si ? meta.si : meta.en} sub={si ? 'නැකත් පත්‍රය අනුව' : 'From the birth chart'} delay={delay}>
      {paras.map(function (p, i) { return <Text key={i} style={[st.aiPara, i > 0 && { marginTop: 9 }]}>{p}</Text>; })}
    </SectionCard>
  );
}

function NarrativeProgress({ progress, si }) {
  var done = progress.done || 0;
  var total = progress.total || 5;
  var pct = Math.min(Math.round((done / Math.max(total, 1)) * 100), 97);
  return (
    <Animated.View entering={FadeInUp.duration(400)} style={st.narrPanel}>
      <View style={st.narrHead}>
        <ActivityIndicator size="small" color="#F472B6" />
        <Text style={st.narrTitle}>{si ? 'බිලිඳාගේ ජීවිත කතාව ලියමින්...' : "Writing your baby's life story..."}</Text>
      </View>
      <Text style={st.narrSub}>{si ? 'නැකත් පත්‍රයෙන් චරිතය, දක්ෂතා, පවුල හා වාසනාව විග්‍රහ කරමින්' : 'Reading character, talents, family and fortune from the chart'}</Text>
      <View style={st.narrList}>
        {AI_SECTIONS.map(function (s, i) {
          var isDone = (progress.completed || []).indexOf(s.key) >= 0 || i < done;
          var active = i === done;
          return (
            <View key={s.key} style={st.narrRow}>
              {isDone ? <Ionicons name="checkmark-circle" size={15} color="#F9D77E" />
                : active ? <ActivityIndicator size={13} color="#F472B6" style={{ width: 15, height: 15 }} />
                  : <Ionicons name="ellipse-outline" size={14} color="rgba(255,255,255,0.18)" />}
              <Text style={[st.narrRowText, isDone && { color: 'rgba(249,215,126,0.9)' }, active && { color: '#FFF1F8', fontWeight: '800' }]} numberOfLines={1}>
                {si ? s.si : s.en}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={st.loaderBarTrack}><View style={[st.narrBarFill, { width: pct + '%' }]} /></View>
      <Text style={st.narrHint}>{si ? 'මෙය මිනිත්තු 1–2ක් ගතවේ — වාර්තාව කියවමින් සිටින්න' : 'This takes 1–2 minutes — keep reading your report'}</Text>
    </Animated.View>
  );
}

function NarrativeBlock({ stage, sections, progress, si, onRetry }) {
  if (stage === 'idle') return null;
  if (stage === 'generating') return <NarrativeProgress progress={progress} si={si} />;
  if (stage === 'complete' && sections) {
    var any = AI_SECTIONS.some(function (m) { return narrativeText(sections[m.key]); });
    if (!any) return null;
    return (
      <View>
        <View style={st.narrDivider}>
          <View style={st.narrDividerLine} />
          <Text style={st.narrDividerText}>{si ? 'ජීවිත කතාව' : 'THE LIFE STORY'}</Text>
          <View style={st.narrDividerLine} />
        </View>
        {AI_SECTIONS.map(function (meta, i) {
          return <AISectionCard key={meta.key} meta={meta} section={sections[meta.key]} si={si} delay={80 + i * 60} />;
        })}
      </View>
    );
  }
  // unavailable | failed → free retry (entitlement covers it)
  return (
    <Animated.View entering={FadeInUp.duration(400)} style={st.narrRetry}>
      <Ionicons name="sparkles-outline" size={20} color="#F9A8D4" />
      <Text style={st.narrRetryTitle}>{si ? 'ජීවිත කතාව ලියන්න සූදානම්' : 'The life story is ready to write'}</Text>
      <Text style={st.narrRetrySub}>{si ? 'චරිතය, දක්ෂතා, පවුල හා වාසනාව පිළිබඳ විග්‍රහය. ඔබට නැවත ගෙවීමක් අවශ්‍ය නැත.' : "The reading of character, talents, family & fortune. You won't be charged again."}</Text>
      <TouchableOpacity activeOpacity={0.88} onPress={onRetry} style={st.narrRetryBtn}>
        <Ionicons name="refresh-outline" size={14} color="#3A0A25" />
        <Text style={st.narrRetryBtnText}>{si ? 'ජීවිත කතාව ලියන්න' : 'Write the life story'}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function VitalitySection({ vitality, si, delay }) {
  if (!vitality || !vitality.note) return null;
  return (
    <SectionCard icon="heart-circle-outline" title={si ? 'ශරීර ස්වභාවය' : 'Vitality & constitution'} delay={delay}>
      <Text style={st.bodyText}>{si ? vitality.note.si : vitality.note.en}</Text>
      <View style={st.vitalDisc}>
        <Ionicons name="medkit-outline" size={12} color="rgba(147,197,253,0.85)" style={{ marginTop: 1 }} />
        <Text style={st.vitalDiscText}>{si ? vitality.disclaimer.si : vitality.disclaimer.en}</Text>
      </View>
    </SectionCard>
  );
}

// ══════════════════════════════════════════
//  Main component
// ══════════════════════════════════════════

var LOCKED_SECTIONS = [
  { icon: 'grid-outline', si: 'සම්පූර්ණ කේන්දර සටහන + ග්‍රහ පිහිටීම් 9', en: 'Full birth chart + 9 planet positions' },
  { icon: 'sparkles-outline', si: 'සම්පූර්ණ ජීවිත කතා විග්‍රහය — චරිතය, දක්ෂතා, පවුල, වාසනාව', en: 'Complete life-story reading — character, talents, family, fortune' },
  { icon: 'text-outline', si: 'සුබ නාම අකුරු 4ම + සිංහල නම් අදහස්', en: 'All 4 naming letters + Sinhala name ideas' },
  { icon: 'shield-checkmark-outline', si: 'දෝෂ පරීක්ෂා 2ක් + සම්ප්‍රදායික පිළියම්', en: '2 dosha checks + traditional remedies' },
  { icon: 'heart-circle-outline', si: 'ධාතු සමතුලනය + ශරීර ස්වභාවය + සුබ දේ', en: 'Element balance + vitality + lucky picks' },
  { icon: 'trending-up-outline', si: 'මුල් අවුරුදුවල දශා කාලරේඛාව', en: 'Early-years dasha timeline' },
  { icon: 'calendar-outline', si: 'නම් තැබීම + ඉඳුල් කට ගෑම නැකැත් දින', en: 'Naming + first-feeding auspicious dates' },
];

export default function BabyKendara() {
  var { language } = useLanguage();
  var { showPaywall } = useAuth();
  var si = language === 'si';

  var [bDate, setBDate] = useState(new Date().toISOString().slice(0, 10));
  var [bTime, setBTime] = useState('10:00');
  var [city, setCity] = useState(null);
  var [gender, setGender] = useState(null); // 'male' | 'female' — MANDATORY
  var [loading, setLoading] = useState(false);
  var [genLoading, setGenLoading] = useState(false);
  var [stage, setStage] = useState(0);
  var [tease, setTease] = useState(null);
  var [pack, setPack] = useState(null);
  var [error, setError] = useState(null);

  // AI life-story (narrative) phase
  var [narrStage, setNarrStage] = useState('idle'); // idle|generating|complete|unavailable|failed
  var [narrSections, setNarrSections] = useState(null);
  var [narrProgress, setNarrProgress] = useState({ done: 0, total: 5, current: null, completed: [] });

  var mountedRef = useRef(true);
  // ── Local persistence: a paid keepsake must survive leaving the screen.
  // We save the pack + AI sections (and a pending reportId so an in-flight
  // narrative can resume polling after a remount) and restore on mount.
  var BABY_SAVE_KEY = '@grahachara_baby_kendara_v1';
  var savedRef = useRef(null);
  var persistBaby = useCallback(function (patch) {
    try {
      var next = Object.assign({}, savedRef.current || {}, patch, { savedAt: new Date().toISOString() });
      savedRef.current = next;
      AsyncStorage.setItem(BABY_SAVE_KEY, JSON.stringify(next)).catch(function () {});
    } catch (e) { /* never block the report on persistence */ }
  }, []);

  var pollRef = useRef(null);
  var stopPoll = useCallback(function () {
    if (pollRef.current) { clearTimeout(pollRef.current); pollRef.current = null; }
  }, []);
  useEffect(function () {
    mountedRef.current = true;
    return function () { mountedRef.current = false; stopPoll(); };
  }, [stopPoll]);

  var lat = city && city.lat != null ? city.lat : 6.9271;
  var lng = city && city.lng != null ? city.lng : 79.8612;
  var birthISO = bDate + 'T' + bTime + ':00';

  var reveal = useCallback(async function () {
    setLoading(true); setError(null); setPack(null); setTease(null);
    try {
      var res = await api.getBabyPreview(birthISO, lat, lng);
      if (mountedRef.current) setTease(res.data);
    } catch (e) {
      if (mountedRef.current) setError((e && e.message) || (si ? 'දෝෂයක් සිදු විය' : 'Something went wrong'));
    } finally { if (mountedRef.current) setLoading(false); }
  }, [birthISO, lat, lng, si]);

  // Poll the AI narrative job to completion, then load the saved life-story.
  var pollNarrative = useCallback(function (reportId) {
    stopPoll();
    var attempts = 0; var MAX = 130; // ~5.5 min ceiling
    function tick() {
      if (!mountedRef.current) return;
      attempts += 1;
      api.getReportProgress(reportId).then(function (prog) {
        if (!mountedRef.current) return;
        var p = prog || {};
        setNarrProgress({ done: p.sectionsDone || 0, total: p.sectionsTotal || 5, current: p.currentSection || null, completed: p.completedSections || [] });
        if (p.stage === 'complete') {
          api.getSavedReport(p.savedReportId || reportId).then(function (r) {
            if (!mountedRef.current) return;
            var d = (r && r.data) || r || {};
            var sections = d.narrativeSections || d.sections || null;
            if (sections && Object.keys(sections).length) {
              setNarrSections(sections); setNarrStage('complete');
              persistBaby({ sections: sections, pendingReportId: null });
            }
            else { setNarrStage('failed'); }
          }).catch(function () { if (mountedRef.current) setNarrStage('failed'); });
          return;
        }
        if (p.stage === 'failed') { setNarrStage('failed'); return; }
        if (attempts >= MAX) { setNarrStage('failed'); return; }
        pollRef.current = setTimeout(tick, 2500);
      }).catch(function () {
        if (!mountedRef.current) return;
        if (attempts >= MAX) { setNarrStage('failed'); return; }
        pollRef.current = setTimeout(tick, 3000);
      });
    }
    pollRef.current = setTimeout(tick, 2000);
  }, [stopPoll]);

  // Route a /generate response's narrative field to the right UI state.
  var handleNarrative = useCallback(function (narr) {
    var n = narr || {};
    if (n.stage === 'complete' && n.sections) {
      setNarrSections(n.sections); setNarrStage('complete');
      persistBaby({ sections: n.sections, pendingReportId: null });
    }
    else if (n.stage === 'queued' && n.reportId) {
      setNarrSections(null); setNarrProgress({ done: 0, total: 5, current: null, completed: [] });
      setNarrStage('generating'); pollNarrative(n.reportId);
      persistBaby({ pendingReportId: n.reportId });
    } else { setNarrStage('unavailable'); }
  }, [pollNarrative, persistBaby]);

  // Restore a previously generated (paid) keepsake on mount — and if the AI
  // life-story was still generating when the user left, resume polling it.
  useEffect(function () {
    AsyncStorage.getItem(BABY_SAVE_KEY).then(function (raw) {
      if (!mountedRef.current || !raw) return;
      var saved = null;
      try { saved = JSON.parse(raw); } catch (e) { return; }
      if (!saved || !saved.pack) return;
      savedRef.current = saved;
      setPack(saved.pack);
      setTease(null);
      if (saved.gender === 'male' || saved.gender === 'female') setGender(saved.gender);
      if (saved.sections && Object.keys(saved.sections).length) {
        setNarrSections(saved.sections); setNarrStage('complete');
      } else if (saved.pendingReportId) {
        // Job may have finished server-side while we were away — poll picks
        // up the cached result immediately if so.
        setNarrStage('generating');
        setNarrProgress({ done: 0, total: 5, current: null, completed: [] });
        pollNarrative(saved.pendingReportId);
      } else {
        setNarrStage('unavailable');
      }
    }).catch(function () {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  var unlock = useCallback(async function () {
    // Gender is mandatory for the pack (server enforces it too).
    if (gender !== 'male' && gender !== 'female') {
      setError(si ? 'කරුණාකර මුලින්ම පුතෙක්ද දුවෙක්ද තෝරන්න' : 'Please choose boy or girl first');
      return;
    }
    // Baby Kendara is a one-time purchase — the paywall handles the buy flow.
    try { await showPaywall('baby'); } catch (e) { return; }
    setError(null); setNarrSections(null); setNarrStage('idle'); setGenLoading(true); setStage(0);

    // Staged cosmic loader while the deterministic keepsake is computed. The
    // AI life-story then streams in below the keepsake (handleNarrative).
    var apiDone = false; var apiRes = null; var apiErr = null;
    var call = api.generateBabyKendara(birthISO, lat, lng, si ? 'si' : 'en', gender)
      .then(function (r) { apiRes = r; apiDone = true; })
      .catch(function (e) { apiErr = e; apiDone = true; });

    await new Promise(function (resolve) {
      var i = 0;
      function tick() {
        if (!mountedRef.current || apiErr) return resolve();
        if (i >= STAGES.length - 1) { if (apiDone) return resolve(); setTimeout(tick, 400); return; }
        i += 1; setStage(i); setTimeout(tick, apiDone ? 300 : 1050);
      }
      setTimeout(tick, apiDone ? 300 : 1050);
    });
    await call;

    if (!mountedRef.current) return;
    setGenLoading(false);
    if (apiErr || !apiRes || !apiRes.data) {
      setError((apiErr && apiErr.message) || (si ? 'දෝෂයක් සිදු විය — නැවත උත්සාහ කරන්න' : 'Something went wrong — please try again'));
      return;
    }
    setPack(apiRes.data);
    setTease(null);
    // Persist the paid keepsake immediately — losing it on unmount meant a
    // paying user could never see their report again.
    persistBaby({ pack: apiRes.data, gender: gender, birthISO: birthISO, sections: null, pendingReportId: null });
    handleNarrative(apiRes.data.narrative);
  }, [gender, showPaywall, birthISO, lat, lng, si, handleNarrative]);

  // Free retry (entitlement makes it free) when the life-story stalls/fails.
  var retryNarrative = useCallback(function () {
    // After a restore the form fields hold defaults, not the baby's birth —
    // retry with the SAVED birth moment so the free retry matches the paid one.
    var saved = savedRef.current || {};
    var g = saved.gender || gender;
    var iso = saved.birthISO || birthISO;
    if (g !== 'male' && g !== 'female') return;
    setNarrStage('generating'); setNarrProgress({ done: 0, total: 5, current: null, completed: [] });
    api.generateBabyKendara(iso, lat, lng, si ? 'si' : 'en', g)
      .then(function (r) { if (mountedRef.current) handleNarrative(r && r.data && r.data.narrative); })
      .catch(function () { if (mountedRef.current) setNarrStage('failed'); });
  }, [gender, birthISO, lat, lng, si, handleNarrative]);

  var onShare = useCallback(async function () {
    if (!pack) return;
    var identity = pack.identity || {};
    var report = pack.report || {};
    var lagna = identity.lagna ? (si ? identity.lagna.sinhala : identity.lagna.english) : '';
    var nak = identity.nakshatra ? ((si ? identity.nakshatra.sinhala : identity.nakshatra.name) + (identity.nakshatra.pada ? (si ? ' (' + identity.nakshatra.pada + ' පාදය)' : ' (pada ' + identity.nakshatra.pada + ')') : '')) : '';
    var letter = report.naming && report.naming.letter ? report.naming.letter.si + ' (' + report.naming.letter.roman + ')' : '';
    var bestNaming = report.rites && report.rites.naming && report.rites.naming.results && report.rites.naming.results.length
      ? report.rites.naming.results.reduce(function (a, b) { return b.score > (a ? a.score : -1) ? b : a; }, null)
      : null;
    var lines = si
      ? [
        'අපේ බිලිඳාගේ කේන්දරය:',
        'ලග්නය: ' + lagna,
        'නැකත: ' + nak,
        letter ? 'සුබ නාම අකුර: ' + letter : null,
        bestNaming ? 'නම් තැබීමට හොඳම දිනය: ' + fmtLocalDate(bestNaming.localDate, true) : null,
        '— Grahachara බිලිඳු කේන්දර වාර්තාවෙන්',
      ]
      : [
        "Our baby's kendara:",
        'Lagna: ' + lagna,
        'Nakshatra: ' + nak,
        letter ? 'Naming letter: ' + letter : null,
        bestNaming ? 'Best naming date: ' + fmtLocalDate(bestNaming.localDate, false) : null,
        '— from the Grahachara Baby Kendara report',
      ];
    try { await Share.share({ message: lines.filter(Boolean).join('\n') }); } catch (e) { /* user dismissed */ }
  }, [pack, si]);

  var onReset = useCallback(function () {
    stopPoll();
    setPack(null); setTease(null); setError(null);
    setNarrSections(null); setNarrStage('idle');
    savedRef.current = null;
    AsyncStorage.removeItem(BABY_SAVE_KEY).catch(function () {});
  }, [stopPoll]);

  // ── Staged loading screen (paid compose) ──
  if (genLoading) {
    return <BabyLoader si={si} stage={stage} />;
  }

  // ── Full report ──
  if (pack) {
    var identity = pack.identity || {};
    var report = pack.report || null;
    return (
      <View>
        <KeepsakeHero identity={identity} report={report} si={si} />
        {report ? (
          <View>
            <ChartSection identity={identity} si={si} delay={100} />
            <PlanetTable planets={report.planets} si={si} delay={160} />
            <StarProfile star={report.starProfile} si={si} delay={220} />
            <NarrativeBlock stage={narrStage} sections={narrSections} progress={narrProgress} si={si} onRetry={retryNarrative} />
            <NamingSection naming={report.naming} si={si} delay={280} />
            <DoshaSection doshas={report.doshas} si={si} delay={340} />
            <ElementsSection elements={report.elements} si={si} delay={400} />
            <VitalitySection vitality={report.vitality} si={si} delay={430} />
            <LuckySection lucky={report.lucky} si={si} delay={460} />
            <DashaSection dashas={report.childhoodDashas} si={si} delay={520} />
            <RitesSection rites={report.rites} si={si} delay={580} />
          </View>
        ) : (
          <LegacyPack pack={pack} si={si} />
        )}
        <ReportFooter identity={identity} report={report} si={si} onShare={onShare} onReset={onReset} />
      </View>
    );
  }

  // ── Input + free tease ──
  return (
    <View>
      <Animated.View entering={FadeInDown.duration(400)} style={st.card}>
        <Text style={st.label}>{si ? 'බිලිඳාගේ උපන් විස්තර' : "Baby's birth details"}</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <View style={{ flex: 1.3 }}><Text style={st.miniLabel}>{si ? 'දිනය' : 'Date'}</Text><DatePickerField value={bDate} onChange={setBDate} /></View>
          <View style={{ flex: 1 }}><Text style={st.miniLabel}>{si ? 'වේලාව' : 'Time'}</Text><TimePickerField value={bTime} onChange={setBTime} /></View>
        </View>
        <Text style={[st.miniLabel, { marginTop: 10 }]}>{si ? 'උපන් ස්ථානය' : 'Birth place'}</Text>
        <CitySearchPicker
          selectedCity={city}
          onSelect={setCity}
          lang={language}
          accentColor="#F472B6"
          compact
          placeholder={si ? 'නගරය තෝරන්න (පෙරනිමිය කොළඹ)' : 'Search city (default Colombo)'}
        />
        <Text style={[st.miniLabel, { marginTop: 12 }]}>{si ? 'බිලිඳා' : 'Baby'}</Text>
        <View style={st.genderPick}>
          <TouchableOpacity activeOpacity={0.85} onPress={function () { setGender('male'); }} style={[st.genderPickBtn, gender === 'male' && st.genderPickBtnOnMale]}>
            <Ionicons name="male" size={15} color={gender === 'male' ? '#0B1E3B' : 'rgba(147,197,253,0.9)'} />
            <Text style={[st.genderPickText, gender === 'male' && { color: '#0B1E3B' }]}>{si ? 'පුතා' : 'Boy'}</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.85} onPress={function () { setGender('female'); }} style={[st.genderPickBtn, gender === 'female' && st.genderPickBtnOn]}>
            <Ionicons name="female" size={15} color={gender === 'female' ? '#3A0A25' : 'rgba(249,168,212,0.95)'} />
            <Text style={[st.genderPickText, gender === 'female' && { color: '#3A0A25' }]}>{si ? 'දුව' : 'Girl'}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <TouchableOpacity activeOpacity={0.88} onPress={reveal} disabled={loading} style={{ marginBottom: 10 }}>
        <LinearGradient colors={['#F9A8D4', '#F472B6', '#EC4899']} style={st.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          {loading ? <ActivityIndicator color="#3A0A25" /> : (
            <>
              <Ionicons name="sparkles" size={16} color="#3A0A25" />
              <Text style={st.btnText}>{si ? 'බිලිඳාගේ කේන්දරය බලන්න' : "Reveal baby's chart"}</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {error ? <Text style={st.err}>{error}</Text> : null}

      {tease ? (
        <Animated.View entering={FadeInUp.duration(400)} style={st.resultCard}>
          <View style={st.idRow}>
            <View style={st.idCol}>
              <Text style={st.idLabel}>{si ? 'ලග්නය' : 'Lagna'}</Text>
              <Text style={st.idVal} numberOfLines={1} adjustsFontSizeToFit>{si ? (tease.lagna && (tease.lagna.sinhala || tease.lagna.english)) : (tease.lagna && tease.lagna.english)}</Text>
            </View>
            <View style={st.idCol}>
              <Text style={st.idLabel}>{si ? 'නැකත' : 'Nakshatra'}</Text>
              <Text style={st.idVal} numberOfLines={1} adjustsFontSizeToFit>{tease.nakshatra && (si ? (tease.nakshatra.sinhala || tease.nakshatra.name) : (tease.nakshatra.name || tease.nakshatra.english))}</Text>
            </View>
          </View>

          {tease.namingLetterCount ? (
            <View style={st.teaseHook}>
              <Ionicons name="text-outline" size={14} color="#F9D77E" />
              <Text style={st.teaseHookText}>
                {si
                  ? 'සුබ නාම අකුරු සොයාගත්තා — වාර්තාවේ අකුරු 4ම + නම් අදහස්'
                  : 'Naming letters found — all 4 letters + name ideas inside'}
              </Text>
            </View>
          ) : null}

          <Text style={st.lockHeading}>{si ? 'සම්පූර්ණ වාර්තාවේ ඇති දේ' : 'Inside the full report'}</Text>
          {LOCKED_SECTIONS.map(function (row, i) {
            return (
              <View key={i} style={st.lockRow}>
                <Ionicons name={row.icon} size={14} color="#F9A8D4" />
                <Text style={st.lockText}>{si ? row.si : row.en}</Text>
                <Ionicons name="lock-closed" size={11} color="rgba(249,198,214,0.55)" />
              </View>
            );
          })}

          <TouchableOpacity activeOpacity={0.88} onPress={unlock} style={st.unlockCta}>
            <Ionicons name="lock-open-outline" size={14} color="#3A0A25" />
            <Text style={st.unlockText}>{si ? 'සම්පූර්ණ වාර්තාව විවෘත කරන්න' : 'Unlock the full report'}</Text>
          </TouchableOpacity>
          <Text style={st.packNote}>{si ? 'එක් වරක් ගෙවීමයි · ක්ෂණිකයි · සදහටම ඔබේ' : 'One-time payment · Instant · Yours forever'}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

// ══════════════════════════════════════════
//  Styles
// ══════════════════════════════════════════

var st = StyleSheet.create({
  // Input + tease (kept from the original look)
  card: { borderRadius: 16, padding: 14, marginBottom: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(244,114,182,0.16)' },
  label: { fontSize: 13, fontWeight: '800', color: '#F9A8D4', letterSpacing: 0.3 },
  miniLabel: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 4 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14 },
  btnText: { fontSize: 15, fontWeight: '900', color: '#3A0A25', letterSpacing: 0.3 },
  err: { color: '#FCA5A5', fontSize: 13, textAlign: 'center', marginVertical: 8 },
  resultCard: { borderRadius: 18, padding: 16, marginTop: 4, backgroundColor: 'rgba(244,114,182,0.05)', borderWidth: 1, borderColor: 'rgba(244,114,182,0.2)' },
  idRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  idCol: { flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)' },
  idLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: 'rgba(255,255,255,0.45)' },
  idVal: { fontSize: 16, fontWeight: '900', color: '#FFF1F8', marginTop: 3, textAlign: 'center' },
  teaseHook: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 10, backgroundColor: 'rgba(249,215,126,0.08)', borderWidth: 1, borderColor: 'rgba(249,215,126,0.18)', marginBottom: 12 },
  teaseHookText: { flex: 1, fontSize: 12.5, fontWeight: '700', color: '#FDE9B8' },
  lockHeading: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: 'rgba(249,198,214,0.7)', marginBottom: 6 },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 7, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  lockText: { flex: 1, fontSize: 12.5, fontWeight: '700', color: 'rgba(255,255,255,0.82)' },
  unlockCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, paddingVertical: 13, borderRadius: 12, backgroundColor: '#F472B6' },
  unlockText: { fontSize: 14, fontWeight: '800', color: '#3A0A25', flexShrink: 1, textAlign: 'center' },
  packNote: { fontSize: 11, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginTop: 10 },

  // Loader
  loaderWrap: { alignItems: 'center', paddingVertical: 34, paddingHorizontal: 18, borderRadius: 20, backgroundColor: 'rgba(244,114,182,0.045)', borderWidth: 1, borderColor: 'rgba(244,114,182,0.16)' },
  loaderOrbitBox: { width: 190, height: 190, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  loaderGlow: { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(244,114,182,0.16)' },
  loaderRing: { position: 'absolute', borderRadius: 999, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(244,114,182,0.22)' },
  loaderCore: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  loaderPlanet: { position: 'absolute', zIndex: 4 },
  loaderTwinkle: { position: 'absolute' },
  loaderTitle: { fontSize: 16.5, fontWeight: '900', color: '#FFE1EE', textAlign: 'center', marginBottom: 5 },
  loaderSub: { fontSize: 12, color: 'rgba(249,198,214,0.6)', textAlign: 'center', lineHeight: 17 },
  loaderList: { width: '100%', borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', paddingVertical: 6, paddingHorizontal: 12, marginBottom: 16 },
  loaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5.5 },
  loaderRowText: { flex: 1, fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.38)' },
  loaderBarTrack: { width: '86%', height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 9 },
  loaderBarFillWrap: { height: '100%', borderRadius: 3, overflow: 'hidden' },
  loaderHint: { fontSize: 11, color: 'rgba(249,198,214,0.55)', textAlign: 'center' },

  // Hero
  hero: { borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(244,114,182,0.3)' },
  heroBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(249,215,126,0.1)', borderWidth: 1, borderColor: 'rgba(249,215,126,0.25)', marginBottom: 10 },
  heroBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 1, color: '#F9D77E' },
  heroBirthLine: { fontSize: 13, fontWeight: '800', color: '#FFF1F8', textAlign: 'center' },
  heroTithi: { fontSize: 11.5, color: 'rgba(249,198,214,0.7)', textAlign: 'center', marginTop: 3 },
  heroIdRow: { flexDirection: 'row', alignItems: 'stretch', marginTop: 14, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.045)', paddingVertical: 12 },
  heroIdCol: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  heroDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroIdLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1, color: 'rgba(255,255,255,0.45)', marginBottom: 3 },
  heroIdVal: { fontSize: 15, fontWeight: '900', color: '#FFF1F8', textAlign: 'center' },
  heroIdMini: { fontSize: 10, color: 'rgba(249,198,214,0.65)', marginTop: 2 },
  heroChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 12 },
  heroChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(244,114,182,0.1)', borderWidth: 1, borderColor: 'rgba(244,114,182,0.22)' },
  heroChipText: { fontSize: 11, fontWeight: '700', color: '#FBD1E4' },

  // Sections
  section: { borderRadius: 18, padding: 15, marginBottom: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(244,114,182,0.16)' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sectionIconBox: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(244,114,182,0.12)', borderWidth: 1, borderColor: 'rgba(244,114,182,0.24)' },
  sectionTitle: { fontSize: 14.5, fontWeight: '900', color: '#F9C6D6' },
  sectionSub: { fontSize: 11, color: 'rgba(249,198,214,0.55)', marginTop: 1 },
  bodyText: { fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 20 },
  miniHeading: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: 'rgba(249,198,214,0.75)', marginTop: 10, marginBottom: 7 },
  infoNote: { flexDirection: 'row', gap: 7, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  infoNoteText: { flex: 1, fontSize: 11.5, color: 'rgba(255,255,255,0.5)', lineHeight: 16.5 },

  // Planets
  planetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  planetName: { width: 84, fontSize: 13, fontWeight: '800', color: '#FFF1F8' },
  retroChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(252,165,165,0.14)', marginRight: 6 },
  retroChipText: { fontSize: 9, fontWeight: '800', color: '#FCA5A5' },
  planetRashi: { flex: 1, fontSize: 12.5, fontWeight: '600', color: 'rgba(255,255,255,0.72)' },
  planetDeg: { fontSize: 12, fontWeight: '700', color: 'rgba(249,215,126,0.85)' },
  d9Divider: { height: 1, backgroundColor: 'rgba(167,139,250,0.2)', marginBottom: 14 },
  d9Title: { fontSize: 15, fontWeight: '800', color: '#C4B5FD', textAlign: 'center', letterSpacing: 0.3 },
  d9Sub: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 3, paddingHorizontal: 12, lineHeight: 17 },
  d9Note: { fontSize: 11.5, fontWeight: '500', fontStyle: 'italic', color: 'rgba(196,181,253,0.72)', textAlign: 'center', marginTop: 12, paddingHorizontal: 14, lineHeight: 16 },

  // Star profile
  chipWrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  softChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.045)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)' },
  softChipText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.78)' },
  giftRow: { flexDirection: 'row', gap: 9, marginTop: 12, padding: 10, borderRadius: 12, backgroundColor: 'rgba(249,215,126,0.06)', borderWidth: 1, borderColor: 'rgba(249,215,126,0.16)' },
  giftLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6, color: '#F9D77E', marginBottom: 2 },
  giftText: { fontSize: 12.5, color: 'rgba(255,255,255,0.85)', lineHeight: 18 },
  parentNote: { flexDirection: 'row', gap: 9, marginTop: 10, padding: 10, borderRadius: 12, backgroundColor: 'rgba(244,114,182,0.07)', borderWidth: 1, borderColor: 'rgba(244,114,182,0.18)' },
  parentNoteLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6, color: '#F9A8D4', marginBottom: 2 },
  parentNoteText: { fontSize: 12.5, color: 'rgba(255,255,255,0.85)', lineHeight: 18 },

  // Naming
  letterHeroRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 },
  letterHero: { width: 76, height: 76, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  letterHeroText: { fontSize: 34, fontWeight: '900', color: '#3A0A25' },
  letterHeroLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, color: 'rgba(249,198,214,0.7)' },
  letterHeroRoman: { fontSize: 19, fontWeight: '900', color: '#FFF1F8', marginTop: 2 },
  letterHeroHint: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 3, lineHeight: 15 },
  padaRow: { flexDirection: 'row', gap: 7 },
  padaChip: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.035)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  padaChipActive: { backgroundColor: 'rgba(244,114,182,0.16)', borderColor: 'rgba(244,114,182,0.5)' },
  padaChipLetter: { fontSize: 17, fontWeight: '900', color: 'rgba(255,255,255,0.75)' },
  padaChipLabel: { fontSize: 9.5, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  padaStar: { position: 'absolute', top: -6, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#F9D77E', alignItems: 'center', justifyContent: 'center' },
  genderRow: { flexDirection: 'row', gap: 7, marginBottom: 9 },
  genderChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(244,114,182,0.2)' },
  genderChipActive: { backgroundColor: '#F9A8D4', borderColor: '#F9A8D4' },
  genderChipText: { fontSize: 11.5, fontWeight: '800', color: 'rgba(249,198,214,0.8)' },
  nameWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  nameChip: { alignItems: 'center', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 12, backgroundColor: 'rgba(249,215,126,0.07)', borderWidth: 1, borderColor: 'rgba(249,215,126,0.2)' },
  nameChipSi: { fontSize: 13.5, fontWeight: '800', color: '#FFF1D0' },
  nameChipRo: { fontSize: 9.5, color: 'rgba(255,241,208,0.6)', marginTop: 1 },
  emptyNames: { fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 17 },

  // Doshas
  doshaCard: { borderRadius: 14, padding: 12, marginTop: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1 },
  doshaHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  doshaTitle: { flex: 1, fontSize: 13, fontWeight: '800', color: '#FFF1F8' },
  doshaPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  doshaPillText: { fontSize: 11, fontWeight: '900' },
  doshaMeaning: { fontSize: 11.5, color: 'rgba(255,255,255,0.5)', lineHeight: 16.5, marginTop: 7 },
  doshaVerdict: { fontSize: 12.5, fontWeight: '600', lineHeight: 18.5, marginTop: 7 },
  severityRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(252,211,77,0.08)' },
  severityText: { flex: 1, fontSize: 11.5, fontWeight: '700', color: '#FDE68A' },
  remedyRow: { flexDirection: 'row', gap: 7, paddingVertical: 4 },
  remedyText: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.78)', lineHeight: 17.5 },

  // Elements
  elementRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 5 },
  elementLabelBox: { width: 74, flexDirection: 'row', alignItems: 'center', gap: 5 },
  elementLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.78)' },
  elementTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  elementFill: { height: '100%', borderRadius: 4, opacity: 0.85 },
  elementPct: { width: 38, fontSize: 11.5, fontWeight: '800', color: 'rgba(255,255,255,0.65)', textAlign: 'right' },

  // Lucky
  luckyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  luckyCell: { width: '47.5%', flexGrow: 1, padding: 11, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.035)', borderWidth: 1, borderColor: 'rgba(249,215,126,0.14)' },
  luckyLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: 'rgba(249,215,126,0.75)', marginTop: 6 },
  luckyValue: { fontSize: 12.5, fontWeight: '700', color: '#FFF6E5', marginTop: 3, lineHeight: 17 },

  // Dashas
  dashaRow: { flexDirection: 'row', gap: 11 },
  dashaLeft: { alignItems: 'center', width: 14 },
  dashaDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#F472B6', marginTop: 4 },
  dashaLine: { flex: 1, width: 2, backgroundColor: 'rgba(244,114,182,0.25)', marginTop: 2 },
  dashaLord: { fontSize: 13, fontWeight: '800', color: '#FFF1F8' },
  dashaAgePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(249,215,126,0.1)' },
  dashaAgeText: { fontSize: 10, fontWeight: '800', color: '#F9D77E' },
  dashaNote: { fontSize: 12, color: 'rgba(255,255,255,0.68)', lineHeight: 17.5, marginTop: 4 },

  // Rites
  riteIntro: { fontSize: 11.5, color: 'rgba(255,255,255,0.5)', marginBottom: 7, marginTop: -3 },
  riteCard: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 11, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginBottom: 8 },
  riteCardBest: { backgroundColor: 'rgba(249,215,126,0.06)', borderColor: 'rgba(249,215,126,0.3)' },
  riteDateBox: { width: 52, alignItems: 'center', paddingVertical: 6, borderRadius: 11, backgroundColor: 'rgba(244,114,182,0.1)' },
  riteDay: { fontSize: 19, fontWeight: '900', color: '#FFF1F8', lineHeight: 22 },
  riteMon: { fontSize: 9.5, fontWeight: '700', color: 'rgba(249,198,214,0.8)', textAlign: 'center' },
  riteWeekday: { fontSize: 13, fontWeight: '800', color: '#FFF1F8' },
  riteBestPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: '#F9D77E' },
  riteBestText: { fontSize: 9, fontWeight: '900', color: '#3A0A25', letterSpacing: 0.5 },
  riteTime: { fontSize: 11.5, color: 'rgba(255,255,255,0.62)', marginTop: 2 },
  riteWhyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5 },
  riteWhyChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2.5, borderRadius: 999, backgroundColor: 'rgba(134,239,172,0.08)' },
  riteWhyText: { fontSize: 9.5, fontWeight: '700', color: 'rgba(187,247,208,0.9)' },
  riteScore: { alignItems: 'center', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 11, minWidth: 56 },
  riteScoreNum: { fontSize: 15, fontWeight: '900' },
  riteScoreLabel: { fontSize: 8.5, fontWeight: '800', marginTop: 1 },

  // Footer
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, marginTop: 2 },
  shareBtnText: { fontSize: 14.5, fontWeight: '900', color: '#3A0A25' },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, marginTop: 4 },
  resetBtnText: { fontSize: 12, fontWeight: '700', color: 'rgba(249,198,214,0.7)' },
  disclaimer: { fontSize: 10.5, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 15, marginTop: 2, paddingHorizontal: 10 },

  // Gender picker (mandatory)
  genderPick: { flexDirection: 'row', gap: 10, marginTop: 2 },
  genderPickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 11, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(244,114,182,0.22)' },
  genderPickBtnOn: { backgroundColor: '#F9A8D4', borderColor: '#F9A8D4' },
  genderPickBtnOnMale: { backgroundColor: '#93C5FD', borderColor: '#93C5FD' },
  genderPickText: { fontSize: 13.5, fontWeight: '800', color: 'rgba(255,241,248,0.85)' },

  // AI narrative
  aiPara: { fontSize: 13, color: 'rgba(255,255,255,0.86)', lineHeight: 20.5 },
  narrDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, marginBottom: 12 },
  narrDividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(244,114,182,0.28)' },
  narrDividerText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, color: '#F9A8D4' },
  narrPanel: { borderRadius: 18, padding: 16, marginBottom: 14, backgroundColor: 'rgba(244,114,182,0.06)', borderWidth: 1, borderColor: 'rgba(244,114,182,0.22)' },
  narrHead: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 4 },
  narrTitle: { flex: 1, fontSize: 14.5, fontWeight: '900', color: '#FFE1EE' },
  narrSub: { fontSize: 11.5, color: 'rgba(249,198,214,0.6)', lineHeight: 16, marginBottom: 12 },
  narrList: { borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', paddingVertical: 5, paddingHorizontal: 11, marginBottom: 12 },
  narrRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 5.5 },
  narrRowText: { flex: 1, fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  narrBarFill: { height: '100%', borderRadius: 3, backgroundColor: '#F472B6' },
  narrHint: { fontSize: 11, color: 'rgba(249,198,214,0.55)', textAlign: 'center', marginTop: 9 },
  narrRetry: { borderRadius: 18, padding: 18, marginBottom: 14, alignItems: 'center', backgroundColor: 'rgba(244,114,182,0.06)', borderWidth: 1, borderColor: 'rgba(244,114,182,0.22)' },
  narrRetryTitle: { fontSize: 14.5, fontWeight: '900', color: '#FFE1EE', marginTop: 8, textAlign: 'center' },
  narrRetrySub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 17, textAlign: 'center', marginTop: 5 },
  narrRetryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 14, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: '#F472B6' },
  narrRetryBtnText: { fontSize: 13.5, fontWeight: '800', color: '#3A0A25' },

  // Vitality
  vitalDisc: { flexDirection: 'row', gap: 7, marginTop: 10, padding: 10, borderRadius: 11, backgroundColor: 'rgba(147,197,253,0.06)', borderWidth: 1, borderColor: 'rgba(147,197,253,0.16)' },
  vitalDiscText: { flex: 1, fontSize: 11, color: 'rgba(200,220,255,0.75)', lineHeight: 15.5 },
});
