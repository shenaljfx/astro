import React, { useState, useEffect } from 'react';
import {
  View, Text, Switch, TouchableOpacity, ScrollView, StyleSheet,
  Platform, TextInput, Alert, ActivityIndicator, Image,
  Dimensions, StatusBar, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown, FadeIn,
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming,
  interpolate, Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Path, G, Defs, RadialGradient as SvgRadialGradient, Stop } from 'react-native-svg';
import DesktopScreenWrapper, { useDesktopCtx } from '../../components/DesktopScreenWrapper';
import SpringPressable from '../../components/effects/SpringPressable';
import CosmicLoader from '../../components/effects/CosmicLoader';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { screenColors } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { usePricing } from '../../contexts/PricingContext';
import CitySearchPicker from '../../components/CitySearchPicker';
import { boxShadow, textShadow } from '../../utils/shadow';
import useReducedMotion from '../../hooks/useReducedMotion';
import useLowEndDevice from '../../hooks/useLowEndDevice';
import { CosmicBackground } from '../../components/CosmicBackground';
import useScreenInsets from '../../hooks/useScreenInsets';
import {
  registerForPushNotifications,
  ensureDailyGuidanceSchedule,
  cancelDailyGuidanceNotifications,
} from '../../services/notifications';
import { registerPushToken, updateNotificationPreferences } from '../../services/api';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ZODIAC_IMAGES } from '../../components/ZodiacIcons';
import AwesomeRashiChakra from '../../components/AwesomeRashiChakra';
import CosmicIdentity from '../../components/CosmicIdentity';

var SW = Dimensions.get('window').width;
var SH = Dimensions.get('window').height;

function formatSubscriptionDate(value) {
  if (!value) return '';
  var text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  var date = new Date(text);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function formatSubscriptionLabel(value) {
  if (!value) return '';
  var text = String(value)
    .replace(/^com\.grahachara\./i, '')
    .replace(/[_-]+/g, ' ')
    .trim();
  if (!text) return '';
  return text.replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
}

// ─────────────────────────────────────────────────────────────────────
//  CITY DATA
// ─────────────────────────────────────────────────────────────────────
var SRI_LANKAN_CITIES = [
  { name: 'Colombo',      nameSi: 'කොළඹ',         lat: '6.9271',  lng: '79.8612' },
  { name: 'Kandy',        nameSi: 'මහනුවර',        lat: '7.2906',  lng: '80.6337' },
  { name: 'Galle',        nameSi: 'ගාල්ල',          lat: '6.0535',  lng: '80.2210' },
  { name: 'Jaffna',       nameSi: 'යාපනය',         lat: '9.6615',  lng: '80.0255' },
  { name: 'Matara',       nameSi: 'මාතර',           lat: '5.9549',  lng: '80.5550' },
  { name: 'Anuradhapura', nameSi: 'අනුරාධපුරය',    lat: '8.3114',  lng: '80.4037' },
  { name: 'Trincomalee',  nameSi: 'ත්‍රිකුණාමලය',  lat: '8.5874',  lng: '81.2152' },
  { name: 'Kurunegala',   nameSi: 'කුරුණෑගල',      lat: '7.4863',  lng: '80.3647' },
  { name: 'Ratnapura',    nameSi: 'රත්නපුරය',       lat: '6.7056',  lng: '80.3847' },
  { name: 'Batticaloa',   nameSi: 'මඩකලපුව',        lat: '7.7310',  lng: '81.6747' },
  { name: 'Badulla',      nameSi: 'බදුල්ල',         lat: '6.9897',  lng: '81.0557' },
  { name: 'Nuwara Eliya', nameSi: 'නුවරඑළිය',       lat: '6.9497',  lng: '80.7891' },
  { name: 'Puttalam',     nameSi: 'පුත්තලම',        lat: '8.0362',  lng: '79.8283' },
  { name: 'Hambantota',   nameSi: 'හම්බන්තොට',      lat: '6.1429',  lng: '81.1185' },
  { name: 'Gampaha',      nameSi: 'ගම්පහ',          lat: '7.0840',  lng: '79.9939' },
];

// ─────────────────────────────────────────────────────────────────────
//  BIRTH MANDALA — animated SVG aura
// ─────────────────────────────────────────────────────────────────────
function BirthMandala({ lagnaIndex, moonIndex, size }) {
  lagnaIndex = lagnaIndex || 0;
  moonIndex  = moonIndex  || 4;
  size       = size       || 130;

  var rot   = useSharedValue(0);
  var pulse = useSharedValue(0.65);
  useEffect(function () {
    rot.value   = withRepeat(withTiming(360, { duration: 26000, easing: Easing.linear }), -1, false);
    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 2600 }), withTiming(0.65, { duration: 2600 })), -1
    );
  }, []);
  var spinStyle = useAnimatedStyle(function () { return { transform: [{ rotate: rot.value + 'deg' }] }; });
  var glowStyle = useAnimatedStyle(function () { return { opacity: pulse.value }; });

  var r = size / 2;
  var palette = ['#9333EA','#FF8C00','#FFB800','#F59E0B','#34D399','#4CC9F0','#FF6B9D','#A78BFA'];
  var lc = palette[lagnaIndex % palette.length];
  var mc = palette[moonIndex  % palette.length];
  var petals = [];
  var n = 8 + (lagnaIndex % 4);
  for (var i = 0; i < n; i++) {
    var a = (i / n) * 2 * Math.PI;
    var px = r + Math.cos(a) * r * 0.42;
    var py = r + Math.sin(a) * r * 0.42;
    var cx1 = r + Math.cos(a - 0.4) * r * 0.55;
    var cy1 = r + Math.sin(a - 0.4) * r * 0.55;
    var cx2 = r + Math.cos(a + 0.4) * r * 0.55;
    var cy2 = r + Math.sin(a + 0.4) * r * 0.55;
    petals.push(
      <Path key={i}
        d={'M ' + r + ' ' + r + ' Q ' + cx1 + ' ' + cy1 + ' ' + px + ' ' + py + ' Q ' + cx2 + ' ' + cy2 + ' ' + r + ' ' + r}
        fill={i % 2 === 0 ? lc + '55' : mc + '33'}
        stroke={i % 2 === 0 ? lc : mc}
        strokeWidth="0.5" strokeOpacity="0.6"
      />
    );
  }

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', width: size, height: size }, glowStyle]}>
        <Svg width={size} height={size}>
          <Defs>
            <SvgRadialGradient id="aura" cx="50%" cy="50%" r="50%">
              <Stop offset="0%"   stopColor={lc} stopOpacity="0.4" />
              <Stop offset="100%" stopColor={lc} stopOpacity="0"   />
            </SvgRadialGradient>
          </Defs>
          <Circle cx={r} cy={r} r={r} fill="url(#aura)" />
        </Svg>
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', width: size, height: size }, spinStyle]}>
        <Svg width={size} height={size}>
          <G>{petals}</G>
          <Circle cx={r} cy={r} r={r * 0.62} fill="none" stroke={lc} strokeWidth="0.5" strokeOpacity="0.3" strokeDasharray="3 4" />
          <Circle cx={r} cy={r} r={r * 0.38} fill="none" stroke={mc} strokeWidth="0.5" strokeOpacity="0.4" />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  LIQUID LIGHT — the hero's signature. Two soft light-blobs drift slowly
//  inside the glass, and a diagonal sheen sweeps across every ~7s, the way
//  light travels through a tilted pane. Stilled under reduced motion.
// ─────────────────────────────────────────────────────────────────────
function LiquidGlow({ reduced }) {
  var drift = useSharedValue(0);
  var sweep = useSharedValue(0);
  useEffect(function () {
    if (reduced) { drift.value = 0.5; sweep.value = 0; return; }
    drift.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }), -1, true);
    sweep.value = withRepeat(withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.quad) }), -1, false);
  }, [reduced]);
  var blob1 = useAnimatedStyle(function () {
    return {
      transform: [
        { translateX: interpolate(drift.value, [0, 1], [-14, 26]) },
        { translateY: interpolate(drift.value, [0, 1], [8, -12]) },
        { scale: interpolate(drift.value, [0, 0.5, 1], [1, 1.14, 1]) },
      ],
    };
  });
  var blob2 = useAnimatedStyle(function () {
    return {
      transform: [
        { translateX: interpolate(drift.value, [0, 1], [18, -22]) },
        { translateY: interpolate(drift.value, [0, 1], [-6, 12]) },
        { scale: interpolate(drift.value, [0, 0.5, 1], [1.1, 0.96, 1.1]) },
      ],
    };
  });
  var sheenStyle = useAnimatedStyle(function () {
    return {
      opacity: interpolate(sweep.value, [0, 0.15, 0.5, 0.85, 1], [0, 0.5, 0.16, 0, 0]),
      transform: [
        { translateX: interpolate(sweep.value, [0, 1], [-SW * 0.7, SW * 1.1]) },
        { rotate: '18deg' },
      ],
    };
  });
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[lg.blob, { top: -46, left: -30, backgroundColor: 'rgba(232,197,106,0.13)' }, blob1]} />
      <Animated.View style={[lg.blob, { bottom: -56, right: -36, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(147,111,235,0.12)' }, blob2]} />
      <Animated.View style={[lg.sheen, sheenStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,251,235,0.10)', 'rgba(255,251,235,0.02)', 'transparent']}
          style={{ flex: 1 }}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
        />
      </Animated.View>
    </View>
  );
}
var lg = StyleSheet.create({
  blob:  { position: 'absolute', width: 220, height: 220, borderRadius: 110 },
  sheen: { position: 'absolute', top: -60, bottom: -60, width: 130 },
});

// ─────────────────────────────────────────────────────────────────────
//  LIQUID GLASS CARD — layered like real glass: deep base, accent tint,
//  a specular top edge where light catches the surface, and a soft
//  bottom depth so the slab reads as having thickness.
// ─────────────────────────────────────────────────────────────────────
function GCard({ children, style, accent }) {
  var ac = accent || '#E8C56A';
  return (
    <View style={[gc.card, { borderColor: ac + '26' }, style]}>
      <LinearGradient colors={['rgba(21,14,33,0.94)', 'rgba(10,6,17,0.97)']} style={StyleSheet.absoluteFill} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} />
      <LinearGradient colors={[ac + '14', 'transparent', ac + '07']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      {/* specular — the surface catches light along its top edge */}
      <LinearGradient colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.02)', 'transparent']} style={gc.specular} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
      <LinearGradient colors={['transparent', 'rgba(255,255,255,0.30)', 'rgba(255,255,255,0.06)', 'transparent']} style={gc.edgeLight} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} />
      {/* depth — the glass thickens toward its base */}
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.32)']} style={gc.depth} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
      <View style={gc.inner}>{children}</View>
    </View>
  );
}
var gc = StyleSheet.create({
  card:  { borderRadius: 26, overflow: 'hidden', borderWidth: 1, marginBottom: 14, ...boxShadow('rgba(0,0,0,0.55)', { width: 0, height: 12 }, 1, 24), elevation: 9 },
  specular: { position: 'absolute', top: 0, left: 0, right: 0, height: 52 },
  edgeLight: { position: 'absolute', top: 0, left: 10, right: 10, height: 1 },
  depth: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 38 },
  inner: { padding: 18 },
});

// ─────────────────────────────────────────────────────────────────────
//  SECTION HEADER
// ─────────────────────────────────────────────────────────────────────
function SectionHeader({ icon, title, subtitle, color }) {
  var c = color || '#A78BFA';
  return (
    <View style={sh.row}>
      <View style={[sh.iconBox, { backgroundColor: c + '16', borderColor: c + '38' }]}>
        <Ionicons name={icon} size={16} color={c} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[sh.title, { color: c }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={sh.sub} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}
var sh = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconBox:{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  title:  { fontSize: 13.5, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  sub:    { fontSize: 11, color: 'rgba(255,255,255,0.62)', marginTop: 2, lineHeight: 15 },
});

// ─────────────────────────────────────────────────────────────────────
//  SETTINGS ROW
// ─────────────────────────────────────────────────────────────────────
function SettingRow({ icon, label, type, value, onPress, onToggle, iconColor, last }) {
  var ic = iconColor || '#7dd3fc';
  return (
    <View>
      <SpringPressable style={sr.row} onPress={onPress} disabled={type === 'switch'} haptic="light" scalePressed={0.97}>
        <View style={[sr.iconWrap, { backgroundColor: ic + '14', borderColor: ic + '30' }]}>
          <Ionicons name={icon} size={16} color={ic} />
        </View>
        <Text style={sr.label} numberOfLines={2}>{label}</Text>
        {type === 'switch' ? (
          <Switch value={value} onValueChange={onToggle} trackColor={{ false: 'rgba(255,255,255,0.08)', true: ic + '99' }} thumbColor={value ? '#FFF6DF' : '#94a3b8'} />
        ) : (
          <View style={sr.chevOrb}>
            <Ionicons name="chevron-forward" size={13} color="rgba(255,246,223,0.5)" />
          </View>
        )}
      </SpringPressable>
      {!last ? (
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.07)', 'transparent']}
          style={sr.hairline}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
        />
      ) : null}
    </View>
  );
}
var sr = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  hairline: { height: 1, marginLeft: 46 },
  iconWrap: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  label:    { flex: 1, fontSize: 14, color: '#F2E3BC', fontWeight: '600', letterSpacing: 0.2 },
  chevOrb:  { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
});

// ─────────────────────────────────────────────────────────────────────
//  LANGUAGE PICKER
// ─────────────────────────────────────────────────────────────────────
function LangPicker({ language, onSwitch }) {
  var LANGS = [
    { key: 'en', label: 'English', native: 'EN' },
    { key: 'si', label: 'සිංහල', native: 'සිං' },
  ];
  return (
    <View style={lp.wrap}>
      {LANGS.map(function (l) {
        var active = language === l.key;
        return (
          <TouchableOpacity key={l.key} style={[lp.pill, active && lp.pillActive]} onPress={function () { onSwitch(l.key); }} activeOpacity={0.85}>
            {active ? (
              <>
                <LinearGradient colors={['rgba(232,197,106,0.24)', 'rgba(214,158,60,0.10)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <LinearGradient colors={['rgba(255,255,255,0.14)', 'transparent']} style={lp.pillSpec} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
              </>
            ) : null}
            <View style={[lp.tag, active && lp.tagActive]}>
              <Text style={[lp.tagText, active && lp.tagTextActive]}>{l.native}</Text>
            </View>
            <Text style={[lp.text, active && lp.textActive]}>{l.label}</Text>
            {active ? <View style={lp.dot} /> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
var lp = StyleSheet.create({
  wrap:       { flexDirection: 'row', gap: 10 },
  pill:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  pillActive: { borderColor: 'rgba(232,197,106,0.55)' },
  pillSpec:   { position: 'absolute', top: 0, left: 0, right: 0, height: 20 },
  tag:        { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  tagActive:  { backgroundColor: 'rgba(232,197,106,0.18)', borderColor: 'rgba(232,197,106,0.45)' },
  tagText:    { fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.62)', letterSpacing: 0.5 },
  tagTextActive: { color: '#F4E4BC' },
  text:       { fontSize: 14, color: 'rgba(255,255,255,0.62)', fontWeight: '600' },
  textActive: { color: '#FFF6DF', fontWeight: '800' },
  dot:        { width: 5, height: 5, borderRadius: 3, backgroundColor: '#E8C56A' },
});

// ─────────────────────────────────────────────────────────────────────
//  THEME PICKER (Auto / Dawn / Dusk)

// ─────────────────────────────────────────────────────────────────────
//  STAT PILL
// ─────────────────────────────────────────────────────────────────────
// One continuous liquid capsule; each stat is a segment behind shared glass.
function StatPill({ value, label, icon, color }) {
  var c = color || '#A78BFA';
  return (
    <View style={sp.pill}>
      <LinearGradient colors={[c + '10', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
      <View style={[sp.orb, { backgroundColor: c + '16', borderColor: c + '38' }]}>
        <Ionicons name={icon} size={14} color={c} />
      </View>
      <Text style={[sp.value, { color: c }]} numberOfLines={1}>{value}</Text>
      <Text style={sp.label} numberOfLines={1}>{label}</Text>
    </View>
  );
}
var sp = StyleSheet.create({
  pill:  { flex: 1, alignItems: 'center', paddingVertical: 13, paddingHorizontal: 6, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.05)' },
  orb:   { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  value: { fontSize: 19, fontWeight: '900', marginBottom: 1 },
  label: { fontSize: 10.5, color: 'rgba(255,255,255,0.62)', fontWeight: '700', textAlign: 'center', letterSpacing: 0.4 },
});

// ─────────────────────────────────────────────────────────────────────
//  GOOGLE AUTH FORM
// ─────────────────────────────────────────────────────────────────────
function PhoneAuthForm() {
  var { t } = useLanguage();
  var { signInWithGoogle } = useAuth();
  var [loading,     setLoading]     = useState(false);
  var [error,       setError]       = useState('');

  async function handleGoogleSignIn() {
    setError(''); setLoading(true);
    try {
      var result = await signInWithGoogle();
      if (result && result.cancelled) {
        // User cancelled — no error
        setLoading(false);
        return;
      }
    } catch (err) {
      setError(err.message || t('error'));
    } finally { setLoading(false); }
  }

  return (
    <GCard accent="#FF8C00">
      <View style={af.header}>
        <View style={af.iconRing}>
          <LinearGradient colors={['#FF8C00','#FF6D00']} style={StyleSheet.absoluteFill} />
          <Ionicons name="sparkles" size={26} color="#fff" />
        </View>
        <Text style={af.title}>{t('signIn')}</Text>
        <Text style={af.sub}>{t('signInGoogleDesc') || 'Sign in with your Google account'}</Text>
      </View>

      {error ? <Text style={af.error}>{error}</Text> : null}
      <TouchableOpacity style={[af.btn, { backgroundColor: '#4285F4' }]} onPress={handleGoogleSignIn} disabled={loading} activeOpacity={0.85}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <View style={{ width: 28, height: 28, borderRadius: 6, backgroundcolor: '#FFF1D0', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#4285F4' }}>G</Text>
          </View>
          {loading ? <CosmicLoader size={24} color="#fff" /> : <Text style={af.btnText}>{t('signInGoogle') || 'Continue with Google'}</Text>}
        </View>
      </TouchableOpacity>
    </GCard>
  );
}
var af = StyleSheet.create({
  header:    { alignItems: 'center', marginBottom: 22 },
  iconRing:  { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 14, borderWidth: 2, borderColor: 'rgba(196,132,252,0.35)' },
  title:     { fontSize: 22, fontWeight: '900', color: '#FFF1D0', marginBottom: 6 },
  sub:       { fontSize: 13, color: 'rgba(255,255,255,0.62)', textAlign: 'center', lineHeight: 19 },
  btn:       { borderRadius: 16, paddingVertical: 16, alignItems: 'center', overflow: 'hidden', marginTop: 4, marginBottom: 4 },
  btnText:   { color: '#FFF1D0', fontSize: 16, fontWeight: '800' },
  error:     { color: '#F87171', fontSize: 13, textAlign: 'center', marginBottom: 10 },
});

// ─────────────────────────────────────────────────────────────────────
//  BIRTH DATA FORM
// ─────────────────────────────────────────────────────────────────────
function BirthDataForm({ currentData, onSave }) {
  var { t, language } = useLanguage();
  var [day,    setDay]    = useState('');
  var [month,  setMonth]  = useState('');
  var [year,   setYear]   = useState('');
  var [hour,   setHour]   = useState('');
  var [minute, setMinute] = useState('');
  var [location, setLocation] = useState(currentData?.locationName || '');
  var [lat,    setLat]    = useState(currentData?.lat || 6.9271);
  var [lng,    setLng]    = useState(currentData?.lng || 79.8612);
  var [saving, setSaving] = useState(false);

  // Build selectedCity object for CitySearchPicker
  var [selectedCity, setSelectedCity] = useState(
    currentData?.locationName
      ? { name: currentData.locationName, lat: currentData.lat || 6.9271, lng: currentData.lng || 79.8612, country: '' }
      : null
  );

  useEffect(function () {
    if (currentData && currentData.dateTime) {
      try {
        var pts  = currentData.dateTime.split('T');
        var dpts = pts[0].split('-');
        var tpts = pts[1].substring(0, 5).split(':');
        setYear(dpts[0] || '');  setMonth(dpts[1] || '');  setDay(dpts[2] || '');
        setHour(tpts[0] || '');  setMinute(tpts[1] || '');
        setLocation(currentData.locationName || '');
        setLat(currentData.lat || 6.9271);
        setLng(currentData.lng || 79.8612);
        if (currentData.locationName) {
          setSelectedCity({ name: currentData.locationName, lat: currentData.lat || 6.9271, lng: currentData.lng || 79.8612, country: '' });
        }
      } catch (e) {}
    }
  }, [currentData]);

  function pad(n) { return n.toString().padStart(2, '0'); }

  async function handleSave() {
    if (!day || !month || !year) { Alert.alert(t('required'), t('requiredDate')); return; }
    var d = parseInt(day), m = parseInt(month), y = parseInt(year);
    if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > 2100) {
      Alert.alert(t('invalidDate'), t('invalidDateMsg')); return;
    }
    setSaving(true);
    try {
      var dt = year + '-' + pad(month) + '-' + pad(day) + 'T' + pad(hour || 0) + ':' + pad(minute || 0) + ':00';
      // timezone intentionally omitted — the server resolves the real IANA
      // zone from the coordinates
      await onSave({ dateTime: dt, lat, lng, locationName: location || 'Colombo' });
      Alert.alert(t('saved'), t('savedMsg'));
    } catch (e) {
      var message = e && e.code === 'BIRTH_TIME_EDIT_LIMIT'
        ? t('birthTimeEditLimitError')
        : ((e && e.message) || t('errorSaving'));
      Alert.alert(t('error'), message);
    }
    finally { setSaving(false); }
  }

  return (
    <GCard accent="#34D399">
      <SectionHeader icon="calendar-outline" title={t('birthDetails')} subtitle={t('birthDetailsHint')} color="#34D399" />

      {/* Date row */}
      <Text style={bf.fieldLabel}>{t('birthDateLabel')}</Text>
      <View style={bf.row}>
        <View style={bf.inputWrap}>
          <Text style={bf.inputHint}>DD</Text>
          <TextInput style={bf.segInput} placeholder="09" placeholderTextColor="rgba(255,255,255,0.22)" value={day}   onChangeText={setDay}   keyboardType="number-pad" maxLength={2} />
        </View>
        <Text style={bf.sep}>/</Text>
        <View style={bf.inputWrap}>
          <Text style={bf.inputHint}>MM</Text>
          <TextInput style={bf.segInput} placeholder="03" placeholderTextColor="rgba(255,255,255,0.22)" value={month} onChangeText={setMonth} keyboardType="number-pad" maxLength={2} />
        </View>
        <Text style={bf.sep}>/</Text>
        <View style={[bf.inputWrap, { flex: 2 }]}>
          <Text style={bf.inputHint}>YYYY</Text>
          <TextInput style={bf.segInput} placeholder="1995" placeholderTextColor="rgba(255,255,255,0.22)" value={year}  onChangeText={setYear}  keyboardType="number-pad" maxLength={4} />
        </View>
      </View>

      {/* Time row */}
      <Text style={bf.fieldLabel}>{t('birthTimeLabel')}</Text>
      <View style={bf.row}>
        <View style={bf.inputWrap}>
          <Text style={bf.inputHint}>HH</Text>
          <TextInput style={bf.segInput} placeholder="08" placeholderTextColor="rgba(255,255,255,0.22)" value={hour}   onChangeText={setHour}   keyboardType="number-pad" maxLength={2} />
        </View>
        <Text style={bf.sep}>:</Text>
        <View style={bf.inputWrap}>
          <Text style={bf.inputHint}>MM</Text>
          <TextInput style={bf.segInput} placeholder="30" placeholderTextColor="rgba(255,255,255,0.22)" value={minute} onChangeText={setMinute} keyboardType="number-pad" maxLength={2} />
        </View>
        <View style={{ flex: 2 }} />
      </View>

      {/* City picker — global search */}
      <Text style={bf.fieldLabel}>{t('birthPlaceLabel')}</Text>
      <CitySearchPicker
        selectedCity={selectedCity}
        onSelect={function (city) {
          setSelectedCity(city);
          setLocation(city.name);
          setLat(city.lat);
          setLng(city.lng);
        }}
        lang={language}
        accentColor="#34D399"
        compact
        maxHeight={180}
        placeholder={language === 'si' ? 'නගරය සොයන්න...' : 'Search any city...'}
      />
      <View style={{ height: 8 }} />

      {/* Save */}
      <SpringPressable style={bf.saveBtn} onPress={handleSave} disabled={saving} haptic="heavy" scalePressed={0.93}>
        <LinearGradient colors={['#FF8C00','#FF6D00','#E65100']} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:0}} />
        <LinearGradient colors={['rgba(255,255,255,0.18)','transparent']} style={{ position:'absolute',top:0,left:0,right:0,height:'60%',borderTopLeftRadius:16,borderTopRightRadius:16 }} />
        {saving
          ? <CosmicLoader size={24} color="#fff" />
          : <><Ionicons name="save-outline" size={17} color="#fff" /><Text style={bf.saveBtnText}>{t('saveBirthData')}</Text></>
        }
      </SpringPressable>
    </GCard>
  );
}
var bf = StyleSheet.create({
  fieldLabel:         { fontSize: 11, color: '#A78BFA', fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  row:                { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 16 },
  inputWrap:          { flex: 1, alignItems: 'center' },
  inputHint:          { fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  segInput:           { width: '100%', backgroundColor: 'rgba(255,255,255,0.09)', borderRadius: 14, paddingVertical: 13, color: '#FFF1D0', fontSize: 20, fontWeight: '900', textAlign: 'center', borderWidth: 1, borderColor: 'rgba(52,211,153,0.25)' },
  sep:                { color: 'rgba(255,255,255,0.55)', fontSize: 20, fontWeight: '200', paddingBottom: 12 },
  saveBtn:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 15, overflow: 'hidden', marginTop: 2, ...boxShadow('#FF8C00', { width: 0, height: 4 }, 0.6, 14) },
  saveBtnText:        { color: '#FFF1D0', fontSize: 15, fontWeight: '800' },
});

// ─────────────────────────────────────────────────────────────────────
//  MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────
function ProfileScreen() {
  var { language, switchLanguage, t } = useLanguage();
  var { colors, gradients, resolved } = useTheme();
  var sc = screenColors(colors);
  var isDesktop = useDesktopCtx();
  var insets = useScreenInsets();
  var reduced = useReducedMotion();
  var lowEnd = useLowEndDevice();
  var { priceLabel, priceAmount } = usePricing();
  var {
    user, loading, isLoggedIn, subscription, isSubscribed,
    signOut, saveBirthData, activateSubscription, cancelSubscription, renewSubscription,
    updateProfile, uploadAvatar,
  } = useAuth();

  // ── Profile identity editing (name + avatar) ──
  var [editingName, setEditingName] = useState(false);
  var [nameDraft, setNameDraft] = useState('');
  var [savingName, setSavingName] = useState(false);
  var [uploadingAvatar, setUploadingAvatar] = useState(false);

  var startEditName = function () {
    var current = user?.displayName || '';
    setNameDraft(current === t('seeker') ? '' : current);
    setEditingName(true);
  };

  var handleSaveName = async function () {
    var trimmed = (nameDraft || '').trim();
    if (!trimmed) { Alert.alert(t('required'), t('nameRequired')); return; }
    setSavingName(true);
    try {
      await updateProfile({ displayName: trimmed });
      setEditingName(false);
    } catch (e) {
      Alert.alert(t('error'), (e && e.message) || t('errorSaving'));
    } finally {
      setSavingName(false);
    }
  };

  var handlePickAvatar = async function () {
    try {
      var perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      // iOS strictly requires the grant; Android 13+ uses the permissionless
      // system photo picker, so don't block there.
      if (perm.status !== 'granted' && Platform.OS === 'ios') {
        Alert.alert(
          t('photoPermissionNeeded'),
          t('photoPermissionDenied'),
          [
            { text: t('cancel'), style: 'cancel' },
            { text: t('notifOpenSettings'), onPress: function () { Linking.openSettings(); } },
          ]
        );
        return;
      }
      var result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (result.canceled || !result.assets || !result.assets[0]) return;

      setUploadingAvatar(true);
      // Resize + compress to a small square so we stay well under the API body limit.
      var processed = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 512 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      if (!processed.base64) throw new Error(t('errorSaving'));
      await uploadAvatar(processed.base64, 'image/jpeg');
    } catch (e) {
      if (__DEV__) console.warn('[Profile] Avatar upload failed:', e && e.message);
      Alert.alert(t('error'), (e && e.message) || t('errorSaving'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ── Notification permission & preference state ──
  var NOTIF_PREFS_KEY = '@grahachara_notif_prefs';
  var [notifPermission, setNotifPermission] = useState('undetermined'); // 'granted' | 'denied' | 'undetermined'
  var [notifPrefs, setNotifPrefs] = useState({
    dailyPalapa: true,
    rahuKalayaAlerts: true,
    marakaApalaAlerts: true,
    transitAlerts: false,
  });
  var [notifLoading, setNotifLoading] = useState(false);

  // Check permission + load saved prefs on mount
  useEffect(function () {
    (async function () {
      try {
        var { status } = await Notifications.getPermissionsAsync();
        setNotifPermission(status);
        var saved = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
        if (saved) {
          try { setNotifPrefs(JSON.parse(saved)); } catch (e) { /* ignore parse errors */ }
        }
      } catch (e) {
        if (__DEV__) console.warn('[Profile] Notif perm check failed:', e);
      }
    })();
  }, []);

  var requestNotifPermission = async function () {
    try {
      setNotifLoading(true);
      var { status } = await Notifications.getPermissionsAsync();
      if (status === 'granted') {
        setNotifPermission('granted');
        var existingPushToken = await registerForPushNotifications(language);
        if (existingPushToken) await registerPushToken(existingPushToken, Platform.OS);
        return;
      }
      // First-time request
      if (status === 'undetermined') {
        var result = await Notifications.requestPermissionsAsync();
        setNotifPermission(result.status);
        if (result.status === 'granted') {
          var pushToken = await registerForPushNotifications(language);
          if (pushToken) await registerPushToken(pushToken, Platform.OS);
        }
        return;
      }
      // Denied — direct user to Settings
      if (Platform.OS === 'web') {
        Alert.alert(t('notifPermissionNeeded'), t('notifPermissionDenied'));
      } else {
        Alert.alert(
          t('notifPermissionNeeded'),
          t('notifPermissionDenied'),
          [
            { text: t('cancel'), style: 'cancel' },
            { text: t('notifOpenSettings'), onPress: function () { Linking.openSettings(); } },
          ]
        );
      }
    } catch (e) {
      if (__DEV__) console.warn('[Profile] Permission request failed:', e);
    } finally {
      setNotifLoading(false);
    }
  };

  var handleLanguageSwitch = function (nextLanguage) {
    switchLanguage(nextLanguage);
    if (notifPermission === 'granted' && notifPrefs.dailyPalapa) {
      ensureDailyGuidanceSchedule(nextLanguage).catch(function (e) {
        if (__DEV__) console.warn('[Profile] Failed to refresh daily guidance language:', e && e.message);
      });
    }
  };

  var toggleNotifPref = function (key) {
    return async function (newValue) {
      var updated = Object.assign({}, notifPrefs);
      updated[key] = newValue;
      setNotifPrefs(updated);
      // Persist locally
      try { await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(updated)); } catch (e) { /* ignore */ }
      if (key === 'dailyPalapa') {
        if (newValue && notifPermission === 'granted') {
          ensureDailyGuidanceSchedule(language).catch(function (e) {
            if (__DEV__) console.warn('[Profile] Failed to schedule daily guidance:', e && e.message);
          });
        } else {
          cancelDailyGuidanceNotifications().catch(function (e) {
            if (__DEV__) console.warn('[Profile] Failed to cancel daily guidance:', e && e.message);
          });
        }
      }
      // Sync with server (fire-and-forget; don't block UI)
      updateNotificationPreferences(updated).catch(function (e) {
        if (__DEV__) console.warn('[Profile] Failed to sync notif prefs:', e);
      });
    };
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={s.centered}>
          <CosmicLoader size={56} color={sc.iconAccent} text={t('loading')} textColor={sc.iconAccent} />
        </View>
      </View>
    );
  }

  var displayName = user?.displayName || t('seeker');
  var phone       = user?.phone || '';
  var birthData   = user?.birthData || null;
  var reportCount = user?.reportCount || 0;
  var chatCount   = user?.chatCount   || 0;
  var subStatus   = subscription?.status || 'none';
  var subscriptionEndsAccess = subStatus === 'active' && subscription?.willRenew === false && !subscription?.isLifetime;
  var subscriptionEndDate = formatSubscriptionDate(subscription?.expiresAt);
  var subscriptionStatusText = subscriptionEndsAccess
    ? t('subCancelledAccessUntil').replace('{{date}}', subscriptionEndDate || '--')
    : subscription?.isLifetime
      ? t('subLifetime')
      : t('subActive').replace('{{amount}}', subscription?.amount || priceAmount('subscription'));
  var subscriptionStatusColor = subStatus === 'active'
    ? (subscriptionEndsAccess ? '#FBBF24' : '#34D399')
    : subStatus === 'expired' || subStatus === 'cancelled' || subStatus === 'payment_failed'
      ? '#F87171'
      : '#A78BFA';
  var subscriptionStatusIcon = subStatus === 'active'
    ? (subscriptionEndsAccess ? 'time-outline' : 'shield-checkmark-outline')
    : subStatus === 'expired'
      ? 'alert-circle-outline'
      : subStatus === 'payment_failed'
        ? 'card-outline'
      : subStatus === 'cancelled'
        ? 'close-circle-outline'
        : 'sparkles-outline';
  var subscriptionAccessLabel = subStatus === 'active'
    ? t('subStatusActiveAccess')
    : subStatus === 'expired'
      ? t('subStatusExpiredAccess')
      : subStatus === 'payment_failed'
        ? t('subStatusPaymentFailedAccess')
      : subStatus === 'cancelled'
        ? t('subStatusCancelledAccess')
        : t('subStatusFreeAccess');
  var subscriptionRenewalLabel = subStatus === 'active'
    ? subscription?.isLifetime
      ? t('subStatusLifetime')
      : subscriptionEndsAccess
        ? t('subStatusRenewOffShort')
        : t('subStatusRenewing')
    : t('subStatusNotRenewing');
  var subscriptionExpiryLabel = subStatus === 'active'
    ? subscription?.isLifetime
      ? t('subStatusNoExpiry')
      : (subscriptionEndDate || t('subStatusUnknown'))
    : t('subStatusNoActiveExpiry');
  var subscriptionPlanLabel = subStatus === 'active'
    ? (formatSubscriptionLabel(subscription?.plan || subscription?.productIdentifier) || t('subStatusProPlan'))
    : t('subStatusNoPlan');
  var subscriptionStoreLabel = subStatus === 'active'
    ? (formatSubscriptionLabel(subscription?.store) || t('subStatusStoreUnknown'))
    : t('subStatusStoreUnknown');
  var subscriptionDetailText = subStatus === 'active'
    ? subscriptionEndsAccess
      ? t('subStatusCancelledDetail')
      : t('subStatusActiveDetail')
    : subStatus === 'expired'
      ? t('subStatusExpiredDetail')
      : subStatus === 'payment_failed'
        ? t('subStatusPaymentFailedDetail')
      : subStatus === 'cancelled'
        ? t('subStatusCancelledDetailNoAccess')
        : t('subStatusFreeDetail');
  var lagnaIdx    = birthData ? (new Date(birthData.dateTime).getMonth() % 12) : 0;
  var moonIdx     = birthData ? (new Date(birthData.dateTime).getDate()  % 8)  : 4;

  return (
    <DesktopScreenWrapper routeName="profile">
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} enabled={Platform.OS === 'ios'}>
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <CosmicBackground reduced={reduced} lowEnd={lowEnd} />
      <StatusBar barStyle={colors.statusBarStyle} />
      <ScrollView style={s.scroll} contentContainerStyle={[s.content, isDesktop && s.contentDesktop, !isDesktop && { paddingTop: insets.contentTop, paddingBottom: insets.contentBottom }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>

        {/* ═══ HERO CARD — liquid glass ═══════════════════════════════ */}
        <Animated.View entering={FadeIn.duration(900)} style={s.heroCard}>
          {/* Deep space bg */}
          <LinearGradient
            colors={gradients.profileHero}
            style={StyleSheet.absoluteFill}
          />
          {/* liquid light — drifting blobs + travelling sheen (the signature) */}
          <LiquidGlow reduced={reduced || lowEnd} />
          {/* Star dots */}
          {[[18,22],[55,14],[78,35],[30,58],[88,12],[12,78],[68,65],[42,80],[92,50]].map(function(pos, i) {
            return <View key={i} style={{ position:'absolute', left:pos[0]+'%', top:pos[1]+'%', width: i%3===0?3:i%3===1?2:1.5, height:i%3===0?3:i%3===1?2:1.5, borderRadius:2, backgroundColor:'rgba(255,255,255,'+(0.15+i*0.04)+')' }} />;
          })}
          {/* specular top edge — glass catching light */}
          <LinearGradient
            colors={['transparent','rgba(255,246,223,0.55)','rgba(232,197,106,0.85)','rgba(255,246,223,0.55)','transparent']}
            style={{ position:'absolute', top:0, left:24, right:24, height:1.2 }}
            start={{ x:0, y:0.5 }} end={{ x:1, y:0.5 }}
          />
          <LinearGradient
            colors={['rgba(255,255,255,0.08)','transparent']}
            style={{ position:'absolute', top:0, left:0, right:0, height:60 }}
            start={{ x:0.5, y:0 }} end={{ x:0.5, y:1 }}
          />
          {/* base depth — the pane thickens */}
          <LinearGradient
            colors={['transparent','rgba(0,0,0,0.35)']}
            style={{ position:'absolute', bottom:0, left:0, right:0, height:56 }}
            start={{ x:0.5, y:0 }} end={{ x:0.5, y:1 }}
          />

          {!isLoggedIn ? (
            /* ── LOGGED OUT STATE ── */
            <View style={s.heroLoggedOut}>
              <View style={s.guestOrbWrap}>
                <LinearGradient colors={['rgba(255,140,0,0.3)','rgba(230,81,0,0.2)']} style={StyleSheet.absoluteFill} />
                <View style={s.guestOrb}>
                  <LinearGradient colors={['#FF8C00','#FF6D00','#E65100']} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:1}} />
                  <LinearGradient colors={['rgba(255,255,255,0.3)','transparent']} style={{position:'absolute',top:0,left:0,right:0,height:'55%',borderTopLeftRadius:38,borderTopRightRadius:38}} />
                  <Ionicons name="person-outline" size={38} color="rgba(255,255,255,0.85)" />
                </View>
              </View>
              <Text style={s.guestTitle}>{t('signIn')}</Text>
              <Text style={s.guestSub}>{t('enterPhone')}</Text>
              <View style={s.guestArrow}>
                <Ionicons name="chevron-down" size={16} color="rgba(255,140,0,0.6)" />
              </View>
            </View>
          ) : (
            /* ── LOGGED IN STATE ── */
            <View style={s.heroContent}>

              {/* Rashi Chakra — subtle background behind mandala */}
              <View style={s.rashiChakraBg}>
                <AwesomeRashiChakra size={Math.min(SW * 0.75, 280)} />
              </View>

              {/* Mandala + avatar */}
              <View style={s.mandalaContainer}>
                <BirthMandala lagnaIndex={lagnaIdx} moonIndex={moonIdx} size={150} />
                {/* Outer ring */}
                <View style={s.avatarRing} />
                {/* Avatar core — user photo, falling back to zodiac sign image */}
                <View style={s.avatarCore}>
                  <LinearGradient colors={['#14082A','#0C0418']} style={StyleSheet.absoluteFill} />
                  <LinearGradient colors={['rgba(255,140,0,0.25)','transparent']} style={{position:'absolute',top:0,left:0,right:0,height:'55%',borderTopLeftRadius:32,borderTopRightRadius:32}} />
                  {user?.photoURL
                    ? <Image source={{ uri: user.photoURL }} style={s.avatarPhoto} />
                    : <Image source={ZODIAC_IMAGES[lagnaIdx]} style={s.avatarZodiacImage} />}
                </View>
                {/* Change-photo button */}
                <TouchableOpacity
                  style={s.avatarEditBtn}
                  onPress={handlePickAvatar}
                  disabled={uploadingAvatar}
                  activeOpacity={0.85}
                  accessibilityLabel={t('changePhoto')}
                >
                  <LinearGradient colors={['#A78BFA','#7C3AED']} style={StyleSheet.absoluteFill} />
                  {uploadingAvatar
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Ionicons name="camera" size={13} color="#fff" />}
                </TouchableOpacity>
                {/* Subscription badge */}
                <View style={[s.badge, isSubscribed ? s.badgePremium : s.badgeFree]}>
                  <LinearGradient
                    colors={isSubscribed ? ['#F59E0B','#D97706'] : ['#FF8C00','#E65100']}
                    style={StyleSheet.absoluteFill}
                  />
                  <Ionicons name={isSubscribed ? 'star' : 'person'} size={12} color="#fff" />
                </View>
              </View>

              {/* Name — tap to edit */}
              {editingName ? (
                <View style={s.nameEditRow}>
                  <TextInput
                    style={s.nameInput}
                    value={nameDraft}
                    onChangeText={setNameDraft}
                    placeholder={t('yourName')}
                    placeholderTextColor="rgba(255,255,255,0.32)"
                    maxLength={25}
                    autoFocus
                    selectionColor="#E8C56A"
                    returnKeyType="done"
                    onSubmitEditing={handleSaveName}
                  />
                  <TouchableOpacity style={s.nameSaveBtn} onPress={handleSaveName} disabled={savingName} activeOpacity={0.85}>
                    <LinearGradient colors={['#34D399','#10B981']} style={StyleSheet.absoluteFill} />
                    {savingName ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark" size={18} color="#fff" />}
                  </TouchableOpacity>
                  <TouchableOpacity style={s.nameCancelBtn} onPress={function () { setEditingName(false); }} disabled={savingName} activeOpacity={0.85}>
                    <Ionicons name="close" size={18} color="#F89B9B" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={s.nameRow} onPress={startEditName} activeOpacity={0.7}>
                  <Text style={s.heroName} numberOfLines={1}>{displayName}</Text>
                  <View style={s.namePencil}>
                    <Ionicons name="pencil" size={12} color="#E8C56A" />
                  </View>
                </TouchableOpacity>
              )}

              {/* Phone with icon badge */}
              {phone ? (
                <View style={s.phonePill}>
                  <View style={s.phoneIcon}>
                    <LinearGradient colors={['#FF8C00','#FF6D00']} style={StyleSheet.absoluteFill} />
                    <Ionicons name="call-outline" size={11} color="#fff" />
                  </View>
                  <Text style={s.phoneText}>{phone}</Text>
                </View>
              ) : null}

              {/* Birth data — 3 chips in a row */}
              {birthData && (
                <View style={s.birthRow}>
                  <View style={s.birthChip}>
                    <LinearGradient colors={['rgba(255,140,0,0.25)','rgba(230,81,0,0.12)']} style={StyleSheet.absoluteFill} />
                    <Ionicons name="calendar-outline" size={14} color="#FF8C00" />
                    <Text style={s.birthChipLabel}>{language === 'si' ? 'උපන් දිනය' : 'Birth Date'}</Text>
                    <Text style={s.birthChipValue} numberOfLines={1}>{birthData.dateTime?.split('T')[0]}</Text>
                  </View>
                  <View style={s.birthChip}>
                    <LinearGradient colors={['rgba(255,184,0,0.2)','rgba(245,158,11,0.08)']} style={StyleSheet.absoluteFill} />
                    <Ionicons name="time-outline" size={14} color="#FFB800" />
                    <Text style={s.birthChipLabel}>{language === 'si' ? 'උපන් වේලාව' : 'Birth Time'}</Text>
                    <Text style={[s.birthChipValue, { color: '#FFB800' }]} numberOfLines={1}>{birthData.dateTime?.split('T')[1]?.substring(0,5)}</Text>
                  </View>
                  <View style={s.birthChip}>
                    <LinearGradient colors={['rgba(52,211,153,0.2)','rgba(16,185,129,0.08)']} style={StyleSheet.absoluteFill} />
                    <Ionicons name="location-outline" size={14} color="#34D399" />
                    <Text style={s.birthChipLabel}>{language === 'si' ? 'උපන් ස්ථානය' : 'Birth Place'}</Text>
                    <Text style={[s.birthChipValue, { color: '#34D399' }]} numberOfLines={1}>
                      {language === 'si'
                        ? (SRI_LANKAN_CITIES.find(function (c) { return c.name === birthData.locationName; })?.nameSi || birthData.locationName || 'කොළඹ')
                        : (birthData.locationName || 'Colombo')}
                    </Text>
                  </View>
                </View>
              )}

              {/* Premium badge ribbon */}
              {isSubscribed && (
                <View style={s.premiumRibbon}>
                  <LinearGradient colors={['rgba(245,158,11,0.22)','rgba(255,184,0,0.1)']} style={StyleSheet.absoluteFill} />
                  <Ionicons name="diamond-outline" size={13} color="#FFB800" />
                  <Text style={s.premiumText}>Premium Member</Text>
                  <Ionicons name="diamond-outline" size={13} color="#FFB800" />
                </View>
              )}
            </View>
          )}
        </Animated.View>

        {/* ═══ NOT LOGGED IN — auth form ═════════════════════════════ */}
        {!isLoggedIn && (
          <Animated.View entering={FadeInDown.delay(180).duration(700)}>
            <PhoneAuthForm />
          </Animated.View>
        )}

        {/* ═══ LOGGED IN ═════════════════════════════════════════════ */}
        {isLoggedIn && (
          <>
            {/* ── STATS ── */}
            <Animated.View entering={FadeInDown.delay(120).duration(700)} style={s.statsRow}>
              <StatPill value={reportCount} label={t('report')}  icon="document-text-outline" color="#FF8C00" />
              <StatPill value={chatCount}   label={t('tabChat')} icon="chatbubble-outline"     color="#FFB800" />
              <StatPill
                value={birthData ? '✓' : '—'}
                label={t('birthDetails')?.replace('🌟 ', '')?.split(' ')[0] || 'Birth'}
                icon="planet-outline"
                color="#34D399"
              />
            </Animated.View>

            {/* ── COSMIC IDENTITY — the full birth chart, relocated from Today ── */}
            {birthData && (
              <Animated.View entering={FadeInDown.delay(150).duration(700)} style={{ marginBottom: 14 }}>
                <CosmicIdentity />
              </Animated.View>
            )}

            {/* ── SUBSCRIPTION ── */}
            <Animated.View entering={FadeInDown.delay(180).duration(700)}>
              <GCard accent={isSubscribed ? '#F59E0B' : '#FF8C00'}>
                <SectionHeader
                  icon={isSubscribed ? 'star' : 'star-outline'}
                  title={t('subscription')}
                  subtitle={isSubscribed ? (subscriptionEndsAccess ? t('subRenewOff') : t('subChargedBy')) : t('subPromo')}
                  color={isSubscribed ? '#FFB800' : '#A78BFA'}
                />
                <View style={s.subStatusPanel}>
                  <View style={s.subStatusHead}>
                    <View style={[s.subStatusIcon, { backgroundColor: subscriptionStatusColor + '18', borderColor: subscriptionStatusColor + '55' }]}>
                      <Ionicons name={subscriptionStatusIcon} size={18} color={subscriptionStatusColor} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[s.subStatusTitle, { color: subscriptionStatusColor }]}>{subscriptionAccessLabel}</Text>
                      <Text style={s.subStatusDetail}>{subscriptionDetailText}</Text>
                    </View>
                  </View>

                  <View style={s.subMetaGrid}>
                    <View style={s.subMetaItem}>
                      <Text style={s.subMetaLabel}>{t('subStatusPlan')}</Text>
                      <Text style={s.subMetaValue} numberOfLines={1}>{subscriptionPlanLabel}</Text>
                    </View>
                    <View style={s.subMetaItem}>
                      <Text style={s.subMetaLabel}>{t('subStatusRenewal')}</Text>
                      <Text style={s.subMetaValue} numberOfLines={2}>{subscriptionRenewalLabel}</Text>
                    </View>
                    <View style={s.subMetaItem}>
                      <Text style={s.subMetaLabel}>{t('subStatusExpiry')}</Text>
                      <Text style={s.subMetaValue} numberOfLines={1}>{subscriptionExpiryLabel}</Text>
                    </View>
                    <View style={s.subMetaItem}>
                      <Text style={s.subMetaLabel}>{t('subStatusStore')}</Text>
                      <Text style={s.subMetaValue} numberOfLines={1}>{subscriptionStoreLabel}</Text>
                    </View>
                  </View>
                </View>
                {subStatus === 'active' && (
                  <>
                    <View style={s.subActiveRow}>
                      <Ionicons name={subscriptionEndsAccess ? 'time-outline' : 'checkmark-circle'} size={16} color={subscriptionStatusColor} />
                      <Text style={[s.subActiveText, subscriptionEndsAccess && s.subEndingText]}>
                        {subscriptionStatusText}
                      </Text>
                    </View>
                    <TouchableOpacity style={s.cancelBtn} onPress={function () {
                      cancelSubscription().catch(function(e) { if (__DEV__) console.warn('Customer Center error:', e.message); });
                    }}>
                      <Text style={s.cancelBtnText}>{t('manageSub') || t('subCancel')}</Text>
                    </TouchableOpacity>
                  </>
                )}
                {subStatus !== 'active' && (
                  <TouchableOpacity style={s.subBtn} onPress={function () {
                    (subStatus === 'expired' ? renewSubscription() : activateSubscription())
                      .then(function (r) { if (r.success) Alert.alert(t('subscription'), r.message || 'Subscribed!'); })
                      .catch(function (e) {
                        var msg = e && e.message ? e.message : '';
                        if (msg.indexOf('cancelled') === -1 && msg.indexOf('dismiss') === -1) {
                          Alert.alert('Payment Failed', msg || 'Please try again or use a different card.');
                        }
                      });
                  }} activeOpacity={0.85}>
                    <LinearGradient colors={['#FF8C00','#FF6D00','#E65100']} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:0}} />
                    <LinearGradient colors={['rgba(255,255,255,0.18)','transparent']} style={{ position:'absolute',top:0,left:0,right:0,height:'55%',borderTopLeftRadius:14,borderTopRightRadius:14 }} />
                    <Ionicons name="diamond-outline" size={17} color="#fff" />
                    <Text style={s.subBtnText}>{(subStatus === 'expired' ? t('subRenew') : t('subSubscribe')).replace('{{subPrice}}', priceLabel('subscription'))}</Text>
                  </TouchableOpacity>
                )}
              </GCard>
            </Animated.View>

            {/* ── BIRTH DATA ── */}
            <Animated.View entering={FadeInDown.delay(240).duration(700)}>
              <BirthDataForm currentData={birthData} onSave={saveBirthData} />
            </Animated.View>

            {/* ── LANGUAGE ── */}
            <Animated.View entering={FadeInDown.delay(300).duration(700)}>
              <GCard accent="#FF8C00">
                <SectionHeader icon="language-outline" title={t('language')} color="#A78BFA" />
                <LangPicker language={language} onSwitch={handleLanguageSwitch} />
              </GCard>
            </Animated.View>

            {/* ── NOTIFICATIONS ── */}
            <Animated.View entering={FadeInDown.delay(360).duration(700)}>
              <GCard accent="#4CC9F0">
                <SectionHeader icon="notifications-outline" title={t('notifications')} color="#4CC9F0" />
                {notifPermission !== 'granted' ? (
                  <View style={{ paddingVertical: 8 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 19, marginBottom: 12 }}>
                      {notifPermission === 'denied' ? t('notifPermissionDenied') : t('notifPermissionDesc')}
                    </Text>
                    <TouchableOpacity
                      onPress={requestNotifPermission}
                      disabled={notifLoading}
                      activeOpacity={0.8}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(76,201,240,0.3)' }}
                    >
                      <LinearGradient colors={['rgba(76,201,240,0.15)', 'rgba(76,201,240,0.05)']} style={StyleSheet.absoluteFill} />
                      <Ionicons name={notifPermission === 'denied' ? 'settings-outline' : 'notifications-outline'} size={16} color="#4CC9F0" />
                      <Text style={{ color: '#4CC9F0', fontWeight: '700', fontSize: 13 }}>
                        {notifPermission === 'denied' ? t('notifOpenSettings') : t('notifPermissionBtn')}
                      </Text>
                      {notifLoading && <ActivityIndicator size="small" color="#4CC9F0" style={{ marginLeft: 4 }} />}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <SettingRow icon="sunny-outline"    label={t('dailyCelestialPush')}    type="switch" value={notifPrefs.dailyPalapa}       onToggle={toggleNotifPref('dailyPalapa')}       iconColor="#FFB800" />
                    <SettingRow icon="moon-outline"     label={t('rahuKalayaAlerts')}      type="switch" value={notifPrefs.rahuKalayaAlerts}   onToggle={toggleNotifPref('rahuKalayaAlerts')}   iconColor="#A78BFA" />
                    <SettingRow icon="alert-circle-outline" label={t('marakaApalaAlerts')} type="switch" value={notifPrefs.marakaApalaAlerts}  onToggle={toggleNotifPref('marakaApalaAlerts')}  iconColor="#F87171" />
                    <SettingRow icon="planet-outline"   label={t('transitAlerts')}         type="switch" value={notifPrefs.transitAlerts}      onToggle={toggleNotifPref('transitAlerts')}      iconColor="#34D399" last />
                  </>
                )}
              </GCard>
            </Animated.View>

            {/* ── ABOUT ── */}
            <Animated.View entering={FadeInDown.delay(420).duration(700)}>
              <GCard accent="#FFB800">
                <SectionHeader icon="information-circle-outline" title={t('about')} color="#FFB800" />
                <SettingRow icon="star-outline"              label={t('rateCosmicAlignment')} iconColor="#FFB800" onPress={function () {
                  var storeUrl = Platform.OS === 'ios'
                    ? 'https://apps.apple.com/app/id6740091498'
                    : 'https://play.google.com/store/apps/details?id=com.grahachara.app';
                  Linking.openURL(storeUrl);
                }} />
                <SettingRow icon="document-text-outline"     label={t('sacredScrolls')}       iconColor="#C4B5FD" onPress={function () { Linking.openURL('https://grahachara.com/legal/terms.html'); }} />
                <SettingRow icon="shield-checkmark-outline"  label={t('privacyPolicy')}       iconColor="#34D399" onPress={function () { Linking.openURL('https://grahachara.com/legal/privacy.html'); }} last />
              </GCard>
            </Animated.View>

            {/* ── SIGN OUT ── */}
            <Animated.View entering={FadeInDown.delay(480).duration(700)}>
              <SpringPressable style={s.signOutBtn} onPress={function () {
                if (Platform.OS === 'web') {
                  if (window.confirm(t('signOut') + '?')) signOut();
                } else {
                  Alert.alert(t('signOut'), t('confirm'), [
                    { text: t('cancel'), style: 'cancel' },
                    { text: t('signOut'), style: 'destructive', onPress: signOut },
                  ]);
                }
              }} haptic="heavy" scalePressed={0.95}>
                <LinearGradient colors={['rgba(248,113,113,0.1)','rgba(239,68,68,0.05)']} style={StyleSheet.absoluteFill} />
                <Ionicons name="log-out-outline" size={18} color="#F87171" />
                <Text style={s.signOutText}>{t('signOut')}</Text>
              </SpringPressable>
            </Animated.View>
          </>
        )}

        <View style={{ height: isDesktop ? 32 : 120 }} />
      </ScrollView>
    </View>
    </KeyboardAvoidingView>
    </DesktopScreenWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  STYLES
// ─────────────────────────────────────────────────────────────────────
var s = StyleSheet.create({
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 76 : 56 },
  contentDesktop: { paddingTop: 20, paddingHorizontal: 28, maxWidth: 800, alignSelf: 'center', width: '100%' },
  centered:{ flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadText:{ color: '#C4B5FD', marginTop: 16, fontSize: 15 },

  // ── Hero card — liquid glass pane ──────────────────────────────────
  heroCard: {
    borderRadius: 34, overflow: 'hidden', marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(232,197,106,0.32)',
    ...boxShadow('rgba(0,0,0,0.6)', { width: 0, height: 14 }, 1, 30), elevation: 14,
  },

  // ── Logged-out hero ────────────────────────────────────────────────
  heroLoggedOut: { alignItems: 'center', paddingTop: 42, paddingBottom: 36, paddingHorizontal: 28 },
  guestOrbWrap:  { width: 100, height: 100, borderRadius: 50, overflow:'hidden', alignItems:'center', justifyContent:'center', marginBottom: 20, borderWidth: 1.5, borderColor: 'rgba(255,140,0,0.25)' },
  guestOrb:      { width: 88, height: 88, borderRadius: 44, overflow:'hidden', alignItems:'center', justifyContent:'center' },
  guestTitle:    { fontSize: 24, fontWeight: '900', color: '#FFF1D0', marginBottom: 8, ...textShadow('rgba(255,140,0,0.5)', {width:0,height:2}, 10) },
  guestSub:      { fontSize: 13, color: 'rgba(255,255,255,0.62)', textAlign: 'center', lineHeight: 20 },
  guestArrow:    { marginTop: 18, width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,140,0,0.2)', alignItems: 'center', justifyContent: 'center' },

  // ── Logged-in hero ─────────────────────────────────────────────────
  heroContent:      { alignItems: 'center', paddingTop: 36, paddingBottom: 28, paddingHorizontal: 20 },
  rashiChakraBg:    { position: 'absolute', top: -20, left: (SW - Math.min(SW * 0.75, 280)) / 2 - 16, opacity: 0.10, pointerEvents: 'none' },
  mandalaContainer: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  avatarRing:       { position:'absolute', width: 98, height: 98, borderRadius: 49, borderWidth: 1.2, borderColor: 'rgba(232,197,106,0.45)' },
  avatarCore:       { position:'absolute', width: 78, height: 78, borderRadius: 39, alignItems:'center', justifyContent:'center', overflow:'hidden', borderWidth: 2, borderColor: 'rgba(244,228,188,0.6)' },
  avatarZodiacImage:{ width: 56, height: 56, resizeMode: 'contain' },
  avatarPhoto:      { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarEditBtn:    { position:'absolute', bottom: 8, left: 8, width: 28, height: 28, borderRadius: 14, alignItems:'center', justifyContent:'center', overflow:'hidden', borderWidth: 2, borderColor: '#0D0720' },
  badge:            { position:'absolute', bottom: 8, right: 8, width: 28, height: 28, borderRadius: 14, alignItems:'center', justifyContent:'center', overflow:'hidden', borderWidth: 2, borderColor: '#0D0720' },
  badgePremium:     {},
  badgeFree:        {},

  heroName:  { fontSize: 27, fontWeight: '900', color: '#FFF6DF', textAlign: 'center', letterSpacing: 0.6, flexShrink: 1, ...textShadow('rgba(232,197,106,0.45)', { width: 0, height: 2 }, 14) },
  nameRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6, maxWidth: '90%' },
  namePencil:{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(232,197,106,0.12)', borderWidth: 1, borderColor: 'rgba(232,197,106,0.35)' },
  nameEditRow:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, alignSelf: 'stretch' },
  // minWidth:0 lets the input shrink below its content/placeholder width — without
  // it flexbox keeps min-width:auto and the save/cancel buttons get pushed off
  // the card's right edge.
  nameInput: { flex: 1, minWidth: 0, backgroundColor: 'rgba(255,255,255,0.09)', borderRadius: 14, paddingVertical: 11, paddingHorizontal: 14, color: '#FFF6DF', fontSize: 18, fontWeight: '800', textAlign: 'center', borderWidth: 1, borderColor: 'rgba(232,197,106,0.4)' },
  nameSaveBtn:{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  nameCancelBtn:{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)', backgroundColor: 'rgba(248,113,113,0.08)' },
  phonePill: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(232,197,106,0.22)' },
  phoneIcon: { width: 20, height: 20, borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  phoneText: { fontSize: 13, color: '#CBB8F5', fontWeight: '600', letterSpacing: 0.5 },

  // Birth details — one liquid bar, three panes fused by hairlines
  birthRow: {
    flexDirection: 'row', marginBottom: 16, width: '100%', borderRadius: 18, overflow: 'hidden',
    backgroundColor: 'rgba(10,6,17,0.55)', borderWidth: 1, borderColor: 'rgba(232,197,106,0.24)',
  },
  birthChip:      { flex: 1, flexDirection: 'column', alignItems: 'center', gap: 4, overflow: 'hidden', paddingVertical: 11, paddingHorizontal: 6, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.06)' },
  birthChipLabel: { fontSize: 10, color: 'rgba(255,255,255,0.62)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 1, textAlign: 'center' },
  birthChipValue: { fontSize: 12, color: '#F4C86A', fontWeight: '800', textAlign: 'center' },

  // Premium ribbon
  premiumRibbon: { flexDirection: 'row', alignItems: 'center', gap: 8, overflow: 'hidden', borderRadius: 999, paddingVertical: 7, paddingHorizontal: 18, borderWidth: 1, borderColor: 'rgba(255,184,0,0.3)' },
  premiumText:   { fontSize: 12, color: '#FFB800', fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },

  // ── Stats — one liquid capsule, three segments ─────────────────────
  statsRow: {
    flexDirection: 'row', marginBottom: 14, borderRadius: 22, overflow: 'hidden',
    backgroundColor: 'rgba(16,10,26,0.88)', borderWidth: 1, borderColor: 'rgba(232,197,106,0.20)',
    ...boxShadow('rgba(0,0,0,0.5)', { width: 0, height: 8 }, 1, 18), elevation: 7,
  },

  // ── Subscription ───────────────────────────────────────────────────
  subStatusPanel: { borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,184,0,0.16)', backgroundColor: 'rgba(255,255,255,0.045)', padding: 12, marginBottom: 12, gap: 11 },
  subStatusHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subStatusIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  subStatusTitle: { fontSize: 15, fontWeight: '900', letterSpacing: 0.2, marginBottom: 2 },
  subStatusDetail: { color: 'rgba(255,255,255,0.68)', fontSize: 12, lineHeight: 18, fontWeight: '500' },
  subMetaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subMetaItem: { flexGrow: 1, flexBasis: '47%', minWidth: 124, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(0,0,0,0.16)', paddingVertical: 9, paddingHorizontal: 10 },
  subMetaLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 10, lineHeight: 13, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 3 },
  subMetaValue: { color: '#FFF1D0', fontSize: 12, lineHeight: 17, fontWeight: '800' },
  subActiveRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  subActiveText: { color: '#34D399', fontWeight: '700', fontSize: 14 },
  subEndingText: { color: '#FBBF24' },
  subBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 16, overflow: 'hidden', ...boxShadow('#FF8C00', { width: 0, height: 4 }, 0.7, 16) },
  subBtnText:    { color: '#FFF1D0', fontSize: 14, fontWeight: '800', flexShrink: 1, textAlign: 'center' },
  cancelBtn:     { paddingVertical: 11, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(248,113,113,0.25)' },
  cancelBtnText: { color: '#F87171', fontWeight: '600', fontSize: 13 },

  // ── Sign out — quiet ruby glass ─────────────────────────────────────
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 15, marginBottom: 8, borderRadius: 22, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(248,113,113,0.22)', backgroundColor: 'rgba(16,8,12,0.7)',
  },
  signOutText:{ color: '#F89B9B', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
});

export default ProfileScreen;
