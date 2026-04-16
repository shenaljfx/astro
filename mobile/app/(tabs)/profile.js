import React, { useState, useEffect } from 'react';
import {
  View, Text, Switch, TouchableOpacity, ScrollView, StyleSheet,
  Platform, TextInput, Alert, ActivityIndicator, Image,
  Dimensions, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown, FadeIn,
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, withSpring,
  interpolate, Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Path, G, Defs, RadialGradient as SvgRadialGradient, Stop } from 'react-native-svg';
import DesktopScreenWrapper, { useDesktopCtx } from '../../components/DesktopScreenWrapper';
import SpringPressable from '../../components/effects/SpringPressable';
import CosmicLoader from '../../components/effects/CosmicLoader';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePricing } from '../../contexts/PricingContext';
import CitySearchPicker from '../../components/CitySearchPicker';
import { boxShadow, textShadow } from '../../utils/shadow';
import TabBackground from '../../components/TabBackground';
import { ZODIAC_IMAGES } from '../../components/ZodiacIcons';
import AwesomeRashiChakra from '../../components/AwesomeRashiChakra';

var SW = Dimensions.get('window').width;
var SH = Dimensions.get('window').height;

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

// ── Upgraded AuraBox ─────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────
//  GLASS CARD
// ─────────────────────────────────────────────────────────────────────
function GCard({ children, style, accent }) {
  var ac = accent || '#FF8C00';
  return (
    <View style={[gc.card, { borderColor: ac + '30' }, style]}>
      <LinearGradient colors={['rgba(14,6,22,0.65)', 'rgba(10,4,16,0.75)']} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={[ac + '18', ac + '06']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <LinearGradient colors={['rgba(255,255,255,0.04)','transparent']} style={{ position:'absolute',top:0,left:0,right:0,height:'45%',borderTopLeftRadius:22,borderTopRightRadius:22 }} />
      <View style={gc.inner}>{children}</View>
    </View>
  );
}
var gc = StyleSheet.create({
  card:  { borderRadius: 22, overflow: 'hidden', borderWidth: 1, marginBottom: 14, ...boxShadow('rgba(255,140,0,0.20)', { width: 0, height: 4 }, 1, 14), elevation: 6 },
  inner: { padding: 18 },
});

// ─────────────────────────────────────────────────────────────────────
//  SECTION HEADER
// ─────────────────────────────────────────────────────────────────────
function SectionHeader({ icon, title, subtitle, color }) {
  var c = color || '#A78BFA';
  return (
    <View style={sh.row}>
      <View style={[sh.iconBox, { backgroundColor: c + '20' }]}>
        <Ionicons name={icon} size={17} color={c} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[sh.title, { color: c }]}>{title}</Text>
        {subtitle ? <Text style={sh.sub}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}
var sh = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconBox:{ width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  title:  { fontSize: 14, fontWeight: '800' },
  sub:    { fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 2 },
});

// ─────────────────────────────────────────────────────────────────────
//  SETTINGS ROW
// ─────────────────────────────────────────────────────────────────────
function SettingRow({ icon, label, type, value, onPress, onToggle, iconColor, last }) {
  var ic = iconColor || '#7dd3fc';
  return (
    <SpringPressable style={[sr.row, !last && sr.rowBorder]} onPress={onPress} disabled={type === 'switch'} haptic="light" scalePressed={0.97}>
      <View style={[sr.iconWrap, { backgroundColor: ic + '20' }]}>
        <Ionicons name={icon} size={17} color={ic} />
      </View>
      <Text style={sr.label}>{label}</Text>
      {type === 'switch' ? (
        <Switch value={value} onValueChange={onToggle} trackColor={{ false: 'rgba(255,255,255,0.08)', true: ic + 'AA' }} thumbColor={value ? ic : '#94a3b8'} />
      ) : (
        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.22)" />
      )}
    </SpringPressable>
  );
}
var sr = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  rowBorder:{ borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  iconWrap: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  label:    { flex: 1, fontSize: 14, color: '#EBCF8B', fontWeight: '500' },
});

// ─────────────────────────────────────────────────────────────────────
//  LANGUAGE PICKER
// ─────────────────────────────────────────────────────────────────────
function LangPicker({ language, onSwitch }) {
  var LANGS = [{ key: 'en', label: 'English', flag: '🇬🇧' }, { key: 'si', label: 'සිංහල', flag: '🇱🇰' }];
  return (
    <View style={lp.wrap}>
      {LANGS.map(function (l) {
        var active = language === l.key;
        return (
          <TouchableOpacity key={l.key} style={[lp.pill, active && lp.pillActive]} onPress={function () { onSwitch(l.key); }} activeOpacity={0.8}>
            {active && <LinearGradient colors={['rgba(255,140,0,0.75)','rgba(230,81,0,0.75)']} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:1}} />}
            <Text style={lp.flag}>{l.flag}</Text>
            <Text style={[lp.text, active && lp.textActive]}>{l.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
var lp = StyleSheet.create({
  wrap:       { flexDirection: 'row', gap: 10 },
  pill:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 14, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  pillActive: { borderColor: 'rgba(255,140,0,0.45)' },
  flag:       { fontSize: 18 },
  text:       { fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  textActive: { color: '#FFF1D0', fontWeight: '800' },
});

// ─────────────────────────────────────────────────────────────────────
//  STAT PILL
// ─────────────────────────────────────────────────────────────────────
function StatPill({ value, label, icon, color }) {
  var c = color || '#A78BFA';
  return (
    <View style={[sp.pill, { borderColor: c + '28' }]}>
      <LinearGradient colors={[c + '18', c + '08']} style={StyleSheet.absoluteFill} />
      <Ionicons name={icon} size={16} color={c} style={{ marginBottom: 4 }} />
      <Text style={[sp.value, { color: c }]}>{value}</Text>
      <Text style={sp.label}>{label}</Text>
    </View>
  );
}
var sp = StyleSheet.create({
  pill:  { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6, borderRadius: 18, overflow: 'hidden', borderWidth: 1 },
  value: { fontSize: 20, fontWeight: '900', marginBottom: 2 },
  label: { fontSize: 10, color: 'rgba(255,255,255,0.38)', fontWeight: '600', textAlign: 'center' },
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
  sub:       { fontSize: 13, color: 'rgba(255,255,255,0.42)', textAlign: 'center', lineHeight: 19 },
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
      await onSave({ dateTime: dt, lat, lng, locationName: location || 'Colombo', timezone: 'Asia/Colombo' });
      Alert.alert(t('saved'), t('savedMsg'));
    } catch (e) { Alert.alert('Error', t('errorSaving')); }
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
  inputHint:          { fontSize: 9, color: 'rgba(255,255,255,0.28)', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  segInput:           { width: '100%', backgroundColor: 'rgba(255,255,255,0.09)', borderRadius: 14, paddingVertical: 13, color: '#FFF1D0', fontSize: 20, fontWeight: '900', textAlign: 'center', borderWidth: 1, borderColor: 'rgba(52,211,153,0.25)' },
  sep:                { color: 'rgba(255,255,255,0.25)', fontSize: 20, fontWeight: '200', paddingBottom: 12 },
  saveBtn:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 15, overflow: 'hidden', marginTop: 2, ...boxShadow('#FF8C00', { width: 0, height: 4 }, 0.6, 14), elevation: 0 },
  saveBtnText:        { color: '#FFF1D0', fontSize: 15, fontWeight: '800' },
});

// ─────────────────────────────────────────────────────────────────────
//  MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────
function ProfileScreen() {
  var { language, switchLanguage, t } = useLanguage();
  var isDesktop = useDesktopCtx();
  var { priceLabel } = usePricing();
  var {
    user, loading, isLoggedIn, subscription, isSubscribed,
    signOut, saveBirthData, activateSubscription, cancelSubscription, renewSubscription,
    restorePurchases, presentCustomerCenter,
  } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#06020C' }}>
        <TabBackground tabName="profile" />
        <View style={s.centered}>
          <CosmicLoader size={56} color="#FF8C00" text={t('loading')} textColor="#FF8C00" />
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
  var lagnaIdx    = birthData ? (new Date(birthData.dateTime).getMonth() % 12) : 0;
  var moonIdx     = birthData ? (new Date(birthData.dateTime).getDate()  % 8)  : 4;

  return (
    <DesktopScreenWrapper routeName="profile">
    <View style={{ flex: 1, backgroundColor: '#06020C' }}>
      <TabBackground tabName="profile" />
      <StatusBar barStyle="light-content" />
      <ScrollView style={s.scroll} contentContainerStyle={[s.content, isDesktop && s.contentDesktop]} showsVerticalScrollIndicator={false}>

        {/* ═══ HERO CARD ══════════════════════════════════════════════ */}
        <Animated.View entering={FadeIn.duration(900)} style={s.heroCard}>
          {/* Deep space bg */}
          <LinearGradient
            colors={['#0D0720', '#08041A', '#050210']}
            style={StyleSheet.absoluteFill}
          />
          {/* Purple nebula top-left */}
          <LinearGradient
            colors={['rgba(255,140,0,0.38)', 'rgba(230,81,0,0.15)', 'transparent']}
            style={{ position:'absolute', top:-30, left:-30, width:200, height:200, borderRadius:100 }}
          />
          {/* Gold nebula bottom-right */}
          <LinearGradient
            colors={['rgba(255,184,0,0.18)', 'rgba(245,158,11,0.08)', 'transparent']}
            style={{ position:'absolute', bottom:-20, right:-20, width:160, height:160, borderRadius:80 }}
          />
          {/* Star dots */}
          {[[18,22],[55,14],[78,35],[30,58],[88,12],[12,78],[68,65],[42,80],[92,50]].map(function(pos, i) {
            return <View key={i} style={{ position:'absolute', left:pos[0]+'%', top:pos[1]+'%', width: i%3===0?3:i%3===1?2:1.5, height:i%3===0?3:i%3===1?2:1.5, borderRadius:2, backgroundColor:'rgba(255,255,255,'+(0.15+i*0.04)+')' }} />;
          })}
          {/* Chromatic top border */}
          <LinearGradient
            colors={['transparent','rgba(255,140,0,0.8)','rgba(255,184,0,0.6)','rgba(230,81,0,0.5)','transparent']}
            style={{ position:'absolute', top:0, left:0, right:0, height:1.5 }}
            start={{ x:0, y:0.5 }} end={{ x:1, y:0.5 }}
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
                {/* Avatar core — zodiac sign image */}
                <View style={s.avatarCore}>
                  <LinearGradient colors={['#14082A','#0C0418']} style={StyleSheet.absoluteFill} />
                  <LinearGradient colors={['rgba(255,140,0,0.25)','transparent']} style={{position:'absolute',top:0,left:0,right:0,height:'55%',borderTopLeftRadius:32,borderTopRightRadius:32}} />
                  <Image source={ZODIAC_IMAGES[lagnaIdx]} style={s.avatarZodiacImage} />
                </View>
                {/* Subscription badge */}
                <View style={[s.badge, isSubscribed ? s.badgePremium : s.badgeFree]}>
                  <LinearGradient
                    colors={isSubscribed ? ['#F59E0B','#D97706'] : ['#FF8C00','#E65100']}
                    style={StyleSheet.absoluteFill}
                  />
                  <Ionicons name={isSubscribed ? 'star' : 'person'} size={12} color="#fff" />
                </View>
              </View>

              {/* Name */}
              <Text style={s.heroName}>{displayName}</Text>

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

            {/* ── SUBSCRIPTION ── */}
            <Animated.View entering={FadeInDown.delay(180).duration(700)}>
              <GCard accent={isSubscribed ? '#F59E0B' : '#FF8C00'}>
                <SectionHeader
                  icon={isSubscribed ? 'star' : 'star-outline'}
                  title={t('subscription')}
                  subtitle={isSubscribed ? t('subChargedBy') : t('subPromo')}
                  color={isSubscribed ? '#FFB800' : '#A78BFA'}
                />
                {subStatus === 'active' && (
                  <>
                    <View style={s.subActiveRow}>
                      <Ionicons name="checkmark-circle" size={16} color="#34D399" />
                      <Text style={s.subActiveText}>
                        {t('subActive').replace('{{amount}}', subscription?.amount || '280')}
                      </Text>
                    </View>
                    <TouchableOpacity style={s.cancelBtn} onPress={function () {
                      presentCustomerCenter().catch(function(e) { console.warn('Customer Center error:', e.message); });
                    }}>
                      <Text style={s.cancelBtnText}>{t('manageSub') || t('subCancel')}</Text>
                    </TouchableOpacity>
                  </>
                )}
                {subStatus !== 'active' && (
                  <TouchableOpacity style={s.subBtn} onPress={function () {
                    (subStatus === 'expired' ? renewSubscription() : activateSubscription())
                      .then(function (r) { if (r.success) Alert.alert('✨', r.message || 'Subscribed!'); })
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
                <LangPicker language={language} onSwitch={switchLanguage} />
              </GCard>
            </Animated.View>

            {/* ── NOTIFICATIONS ── */}
            <Animated.View entering={FadeInDown.delay(360).duration(700)}>
              <GCard accent="#4CC9F0">
                <SectionHeader icon="notifications-outline" title={t('notifications')} color="#4CC9F0" />
                <SettingRow icon="sunny-outline"    label={t('dailyCelestialPush')}    type="switch" value={true}  iconColor="#FFB800" />
                <SettingRow icon="moon-outline"     label={t('rahuKalayaAlerts')}      type="switch" value={true}  iconColor="#A78BFA" />
                <SettingRow icon="location-outline" label={t('syncHoroscopeLocation')} type="switch" value={false} iconColor="#34D399" last />
              </GCard>
            </Animated.View>

            {/* ── ABOUT ── */}
            <Animated.View entering={FadeInDown.delay(420).duration(700)}>
              <GCard accent="#FFB800">
                <SectionHeader icon="information-circle-outline" title={t('about')} color="#FFB800" />
                <SettingRow icon="star-outline"              label={t('rateCosmicAlignment')} iconColor="#FFB800" />
                <SettingRow icon="document-text-outline"     label={t('sacredScrolls')}       iconColor="#C4B5FD" />
                <SettingRow icon="shield-checkmark-outline"  label={t('privacyPolicy')}       iconColor="#34D399" last />
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

  // ── Hero card ──────────────────────────────────────────────────────
  heroCard: {
    borderRadius: 32, overflow: 'hidden', marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,140,0,0.35)',
    ...boxShadow('#FF8C00', { width: 0, height: 10 }, 0.45, 30), elevation: 16,
  },

  // ── Logged-out hero ────────────────────────────────────────────────
  heroLoggedOut: { alignItems: 'center', paddingTop: 42, paddingBottom: 36, paddingHorizontal: 28 },
  guestOrbWrap:  { width: 100, height: 100, borderRadius: 50, overflow:'hidden', alignItems:'center', justifyContent:'center', marginBottom: 20, borderWidth: 1.5, borderColor: 'rgba(255,140,0,0.25)' },
  guestOrb:      { width: 88, height: 88, borderRadius: 44, overflow:'hidden', alignItems:'center', justifyContent:'center' },
  guestTitle:    { fontSize: 24, fontWeight: '900', color: '#FFF1D0', marginBottom: 8, ...textShadow('rgba(255,140,0,0.5)', {width:0,height:2}, 10) },
  guestSub:      { fontSize: 13, color: 'rgba(255,255,255,0.38)', textAlign: 'center', lineHeight: 20 },
  guestArrow:    { marginTop: 18, width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,140,0,0.2)', alignItems: 'center', justifyContent: 'center' },

  // ── Logged-in hero ─────────────────────────────────────────────────
  heroContent:      { alignItems: 'center', paddingTop: 36, paddingBottom: 28, paddingHorizontal: 20 },
  rashiChakraBg:    { position: 'absolute', top: -20, left: (SW - Math.min(SW * 0.75, 280)) / 2 - 16, opacity: 0.10, pointerEvents: 'none' },
  mandalaContainer: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  avatarRing:       { position:'absolute', width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: 'rgba(255,140,0,0.35)', borderStyle: 'dashed' },
  avatarCore:       { position:'absolute', width: 78, height: 78, borderRadius: 39, alignItems:'center', justifyContent:'center', overflow:'hidden', borderWidth: 2.5, borderColor: 'rgba(255,184,0,0.55)' },
  avatarZodiacImage:{ width: 56, height: 56, resizeMode: 'contain' },
  badge:            { position:'absolute', bottom: 8, right: 8, width: 28, height: 28, borderRadius: 14, alignItems:'center', justifyContent:'center', overflow:'hidden', borderWidth: 2, borderColor: '#0D0720' },
  badgePremium:     {},
  badgeFree:        {},

  heroName:  { fontSize: 28, fontWeight: '900', color: '#FFF1D0', marginBottom: 6, textAlign: 'center', letterSpacing: 0.5, ...textShadow('rgba(255,140,0,0.4)', { width: 0, height: 2 }, 12) },
  phonePill: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 18, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(255,140,0,0.2)' },
  phoneIcon: { width: 20, height: 20, borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  phoneText: { fontSize: 13, color: '#A78BFA', fontWeight: '600', letterSpacing: 0.5 },

  // Birth chips row
  birthRow:       { flexDirection: 'row', gap: 6, marginBottom: 16, width: '100%' },
  birthChip:      { flex: 1, flexDirection: 'column', alignItems: 'center', gap: 4, overflow: 'hidden', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 6, borderWidth: 1, borderColor: 'rgba(255,140,0,0.2)' },
  birthChipLabel: { fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 1, textAlign: 'center' },
  birthChipValue: { fontSize: 12, color: '#FF8C00', fontWeight: '800', textAlign: 'center' },

  // Premium ribbon
  premiumRibbon: { flexDirection: 'row', alignItems: 'center', gap: 8, overflow: 'hidden', borderRadius: 999, paddingVertical: 7, paddingHorizontal: 18, borderWidth: 1, borderColor: 'rgba(255,184,0,0.3)' },
  premiumText:   { fontSize: 12, color: '#FFB800', fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },

  // ── Stats row ──────────────────────────────────────────────────────
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },

  // ── Subscription ───────────────────────────────────────────────────
  subActiveRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  subActiveText: { color: '#34D399', fontWeight: '700', fontSize: 14 },
  subBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 16, overflow: 'hidden', ...boxShadow('#FF8C00', { width: 0, height: 4 }, 0.7, 16), elevation: 0 },
  subBtnText:    { color: '#FFF1D0', fontSize: 14, fontWeight: '800', flexShrink: 1, textAlign: 'center' },
  cancelBtn:     { paddingVertical: 11, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(248,113,113,0.25)' },
  cancelBtnText: { color: '#F87171', fontWeight: '600', fontSize: 13 },

  // ── Sign out ────────────────────────────────────────────────────────
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, marginBottom: 8, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(248,113,113,0.18)' },
  signOutText:{ color: '#F87171', fontSize: 15, fontWeight: '700' },
});

export default ProfileScreen;
