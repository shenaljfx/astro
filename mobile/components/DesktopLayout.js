/**
 * DesktopLayout - Nakath AI Desktop Shell
 *
 * DesktopSidebar (default export) is used as the tabBar prop in Expo Router Tabs.
 * It renders as a fixed absolute left panel; Expo Router renders screens in the
 * sceneContainer which is offset left via sceneContainerStyle paddingLeft.
 *
 * DesktopTopBar (named export) is rendered at the top of each screen via
 * DesktopScreenWrapper when the viewport is desktop-sized.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming, withRepeat, withSequence,
  interpolate, Easing,
} from 'react-native-reanimated';

// ── Nav items (mirror TABS in _layout.js) ─────────────────────────
export var NAV_ITEMS = [
  { name: 'index',    title: 'Today',  titleSi: 'අද',
    icon: 'sunny-outline',         iconFocused: 'sunny',
    gradient: ['#FBBF24','#F59E0B'],
    description: "Today's cosmic forecast",  descriptionSi: 'අද දවසේ අනාවැකිය' },
  { name: 'kendara',  title: 'Chart',  titleSi: '\u0d9a\u0dda\u0db1\u0dca\u0daf\u0dbb\u0dda',
    icon: 'planet-outline',        iconFocused: 'planet',
    gradient: ['#C084FC','#9333EA'],
    description: 'Birth chart and planets',  descriptionSi: '\u0da2\u0db1\u0dca\u0db8 \u0d9a\u0dda\u0db1\u0dca\u0daf\u0dbb\u0dba' },
  { name: 'report',   title: 'Report', titleSi: '\u0dc0\u0dcf\u0dbb\u0dca\u0dad\u0dcf\u0dc0',
    icon: 'document-text-outline', iconFocused: 'document-text',
    gradient: ['#34D399','#059669'],
    description: 'Full Jyotish report',      descriptionSi: '\u0dc3\u0db8\u0dca\u0db4\u0dd6\u0dbb\u0dca\u0dab \u0dc0\u0dcf\u0dbb\u0dca\u0dad\u0dcf\u0dc0' },
  { name: 'chat',     title: 'Guide',  titleSi: '\u0db8\u0dcf\u0dbb\u0dca\u0d9c\u0dba',
    icon: 'sparkles-outline',      iconFocused: 'sparkles',
    gradient: ['#FBBF24','#9333EA'],
    description: 'AI astrology guide',       descriptionSi: 'AI \u0db8\u0dcf\u0dbb\u0dca\u0d9c\u0ddc\u0db4\u0daf\u0dda\u0dc1\u0dba' },
  { name: 'porondam', title: 'Match',  titleSi: '\u0db4\u0ddc\u0dbb\u0ddc\u0db1\u0dca\u0daf\u0db8',
    icon: 'heart-circle-outline',  iconFocused: 'heart-circle',
    gradient: ['#F472B6','#DB2777'],
    description: 'Compatibility score',      descriptionSi: '\u0d9c\u0dd0\u0dbd\u0db4\u0dd3\u0db8\u0dca \u0dbd\u0d9a\u0dd4\u0dab\u0dd4' },
  { name: 'profile',  title: 'Aura',   titleSi: '\u0db8\u0db8',
    icon: 'person-circle-outline', iconFocused: 'person-circle',
    gradient: ['#4CC9F0','#3B82F6'],
    description: 'Your birth profile',       descriptionSi: '\u0d94\u0db6\u0dda \u0da2\u0db1\u0dca\u0db8 \u0daf\u0dad\u0dca' },
];

export var SIDEBAR_W_EXPANDED  = 260;
export var SIDEBAR_W_COLLAPSED = 72;
export var TOPBAR_H            = 64;

// ── Chromatic sweep line ───────────────────────────────────────────
function ChromaticLine() {
  var x = useSharedValue(0);
  useEffect(function () {
    x.value = withRepeat(withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);
  var mv = useAnimatedStyle(function () {
    return { transform: [{ translateX: interpolate(x.value, [0, 1], [-200, 200]) }] };
  });
  return (
    <View style={{ height: 1.5, overflow: 'hidden' }}>
      <LinearGradient
        colors={['rgba(251,191,36,0)', 'rgba(251,191,36,0.75)', 'rgba(147,51,234,0.85)', 'rgba(76,201,240,0.75)', 'rgba(76,201,240,0)']}
        style={{ height: 1.5, width: '100%' }}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      />
      <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, width: 130, opacity: 0.55 }, mv]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.9)', 'transparent']}
          style={{ flex: 1 }}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        />
      </Animated.View>
    </View>
  );
}

// ── Logo ───────────────────────────────────────────────────────────
var LOGO = require('../assets/logo.png');

function SidebarLogo({ collapsed }) {
  var glow = useSharedValue(0.55);
  useEffect(function () {
    glow.value = withRepeat(
      withSequence(
        withTiming(1,    { duration: 2800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.55, { duration: 2800, easing: Easing.inOut(Easing.sin) })
      ), -1, true
    );
  }, []);
  var glowStyle = useAnimatedStyle(function () { return { opacity: glow.value }; });
  return (
    <View style={sb.logoRow}>
      <View style={sb.logoIconWrap}>
        <Animated.View style={[StyleSheet.absoluteFill, sb.logoGlowLayer, glowStyle]} />
        <Image source={LOGO} style={sb.logoImg} resizeMode="contain" />
      </View>
      {!collapsed && (
        <View style={{ marginLeft: 12, flex: 1, minWidth: 0 }}>
          <Text style={sb.logoTitle}>NAKATH</Text>
          <Text style={sb.logoSubtitle}>AI · Vedic Guide</Text>
        </View>
      )}
    </View>
  );
}

// ── Nav item ───────────────────────────────────────────────────────
function NavItem({ item, focused, collapsed, language, onPress }) {
  var scale  = useSharedValue(1);
  var pillOp = useSharedValue(focused ? 1 : 0);
  var indW   = useSharedValue(focused ? 3 : 0);
  useEffect(function () {
    pillOp.value = withTiming(focused ? 1 : 0, { duration: 200 });
    indW.value   = withTiming(focused ? 3 : 0, { duration: 200 });
  }, [focused]);
  function onIn()  { scale.value = withSpring(0.96, { damping: 12, stiffness: 360 }); }
  function onOut() { scale.value = withSpring(1,    { damping: 10, stiffness: 260 }); }
  var scaleStyle = useAnimatedStyle(function () { return { transform: [{ scale: scale.value }] }; });
  var pillStyle  = useAnimatedStyle(function () { return { opacity: pillOp.value }; });
  var indStyle   = useAnimatedStyle(function () { return { width: indW.value }; });
  var iconColor  = focused ? item.gradient[0] : 'rgba(255,255,255,0.38)';
  var label      = language === 'si' ? item.titleSi : item.title;
  var desc       = language === 'si' ? item.descriptionSi : item.description;
  return (
    <Animated.View style={scaleStyle}>
      <TouchableOpacity
        onPress={onPress} onPressIn={onIn} onPressOut={onOut} activeOpacity={1}
        style={[sb.navItem, collapsed && sb.navItemCollapsed]}
        accessibilityRole="button"
        accessibilityState={focused ? { selected: true } : {}}
        accessibilityLabel={label}
      >
        <Animated.View style={[StyleSheet.absoluteFill, sb.navPill, pillStyle]} pointerEvents="none">
          <LinearGradient
            colors={[item.gradient[0] + '20', item.gradient[1] + '0C']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />
          <View style={[sb.navPillBorder, { borderColor: item.gradient[0] + '35' }]} />
        </Animated.View>
        <Animated.View style={[sb.navIndicator, indStyle, { backgroundColor: item.gradient[0] }]} />
        <View style={[sb.navIconWrap, focused && { backgroundColor: item.gradient[0] + '1C' }]}>
          <Ionicons name={focused ? item.iconFocused : item.icon} size={19} color={iconColor} />
        </View>
        {!collapsed && (
          <View style={sb.navTextWrap}>
            <Text style={[sb.navLabel, focused && { color: item.gradient[0] }]} numberOfLines={1}>{label}</Text>
            <Text style={sb.navDesc} numberOfLines={1}>{desc}</Text>
          </View>
        )}
        {focused && !collapsed && (
          <View style={[sb.activeDot, { backgroundColor: item.gradient[0] }]} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Balance chip ───────────────────────────────────────────────────
function BalanceChip({ balance, collapsed }) {
  if (balance === null || balance === undefined) return null;
  var isLow = balance < 10;
  var c = isLow ? '#F87171' : '#FBBF24';
  return (
    <View style={[sb.balanceChip, { borderColor: c + '42', backgroundColor: c + '10' }]}>
      <Ionicons name="wallet-outline" size={13} color={c} />
      {!collapsed && <Text style={[sb.balanceText, { color: c }]}>LKR {balance}</Text>}
    </View>
  );
}

// ── Language toggle ────────────────────────────────────────────────
function LangToggle({ language, onToggle, collapsed }) {
  var isEn = language === 'en';
  return (
    <TouchableOpacity
      onPress={onToggle} activeOpacity={0.78} style={sb.langBtn}
      accessibilityRole="button" accessibilityLabel="Toggle language"
    >
      <LinearGradient
        colors={isEn ? ['#7C3AED', '#3B82F6'] : ['#B45309', '#9333EA']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />
      <Ionicons name="language-outline" size={15} color="#FFF" />
      {!collapsed && <Text style={sb.langText}>{isEn ? '\u0dc3\u0dd2\u0d82\u0dc4\u0dbd' : 'English'}</Text>}
    </TouchableOpacity>
  );
}

// ── Top bar (exported, used inside each tab screen on desktop) ─────
export function DesktopTopBar({ routeName, language, balance, onToggleLanguage }) {
  var activeItem = NAV_ITEMS.find(function (n) { return n.name === routeName; });
  var [timeStr, setTimeStr] = useState('');
  useEffect(function () {
    function tick() {
      var now = new Date();
      var slt = new Date(now.getTime() + 5.5 * 3600000);
      var h   = slt.getUTCHours();
      var m   = String(slt.getUTCMinutes()).padStart(2, '0');
      var ap  = h >= 12 ? 'PM' : 'AM';
      setTimeStr(String(h % 12 || 12) + ':' + m + ' ' + ap + ' SLT');
    }
    tick();
    var id = setInterval(tick, 30000);
    return function () { clearInterval(id); };
  }, []);
  var label = activeItem ? (language === 'si' ? activeItem.titleSi : activeItem.title) : '';
  var desc  = activeItem ? (language === 'si' ? activeItem.descriptionSi : activeItem.description) : '';
  return (
    <View style={top.bar}>
      {activeItem && (
        <LinearGradient colors={activeItem.gradient} style={top.accentStripe} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
      )}
      <View style={top.leftGroup}>
        <Text style={top.logoText}>Nakath AI</Text>
        <View style={top.leftDivider} />
        {activeItem && (
          <View style={[top.iconCircle, { backgroundColor: activeItem.gradient[0] + '1A' }]}>
            <Ionicons name={activeItem.iconFocused} size={16} color={activeItem.gradient[0]} />
          </View>
        )}
        <View>
          <Text style={top.sectionTitle}>{label}</Text>
          <Text style={top.sectionDesc}>{desc}</Text>
        </View>
      </View>
      <View style={top.rightGroup}>
        {!!timeStr && (
          <View style={top.clockPill}>
            <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.38)" />
            <Text style={top.clockText}>{timeStr}</Text>
          </View>
        )}
        {onToggleLanguage && (
          <TouchableOpacity onPress={onToggleLanguage} style={top.langToggle}>
            <Ionicons name="language-outline" size={14} color="rgba(255,255,255,0.5)" />
            <Text style={top.langToggleText}>{language === 'si' ? 'EN' : 'SI'}</Text>
          </TouchableOpacity>
        )}
        {balance !== null && balance !== undefined && (
          <View style={[top.balancePill, balance < 10 && { borderColor: 'rgba(248,113,113,0.4)' }]}>
            <Ionicons name="wallet-outline" size={12} color={balance < 10 ? '#F87171' : '#FBBF24'} />
            <Text style={[top.balanceVal, balance < 10 && { color: '#F87171' }]}>LKR {balance}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ── MAIN: Sidebar panel (used as tabBar prop in Tabs) ──────────────
export default function DesktopSidebar({ state, navigation, balance, language, onToggleLanguage, onCollapseChange }) {
  var [collapsed, setCollapsed] = useState(false);
  var sideW = useSharedValue(SIDEBAR_W_EXPANDED);
  useEffect(function () {
    sideW.value = withSpring(
      collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W_EXPANDED,
      { damping: 18, stiffness: 200 }
    );
    if (onCollapseChange) onCollapseChange(collapsed);
  }, [collapsed]);
  var sideStyle = useAnimatedStyle(function () { return { width: sideW.value }; });

  function navigateTo(routeName) {
    var route = state.routes.find(function (r) { return r.name === routeName; });
    if (!route) return;
    var ev = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!ev.defaultPrevented) navigation.navigate(routeName);
  }

  return (
    <Animated.View style={[styles.sidebar, sideStyle]}>
      <LinearGradient colors={['rgba(14,8,36,0.99)', 'rgba(6,4,18,0.99)']} style={StyleSheet.absoluteFill} />
      <View style={styles.borderRight} pointerEvents="none" />
      <ChromaticLine />
      <View style={sb.logoSection}>
        <SidebarLogo collapsed={collapsed} />
        <TouchableOpacity
          onPress={function () { setCollapsed(function (c) { return !c; }); }}
          activeOpacity={0.7} style={sb.collapseBtn}
          accessibilityRole="button"
          accessibilityLabel={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Ionicons
            name={collapsed ? 'chevron-forward' : 'chevron-back'}
            size={15} color="rgba(255,255,255,0.32)"
          />
        </TouchableOpacity>
      </View>
      <View style={sb.divider} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={sb.navList} showsVerticalScrollIndicator={false}>
        {NAV_ITEMS.map(function (item) {
          var route = state.routes.find(function (r) { return r.name === item.name; });
          if (!route) return null;
          var focused = state.index === state.routes.indexOf(route);
          return (
            <NavItem
              key={item.name} item={item} focused={focused}
              collapsed={collapsed} language={language}
              onPress={function () { navigateTo(item.name); }}
            />
          );
        })}
      </ScrollView>
      <View style={sb.bottomSection}>
        <View style={sb.divider} />
        <BalanceChip balance={balance} collapsed={collapsed} />
        <LangToggle language={language} onToggle={onToggleLanguage} collapsed={collapsed} />
        {!collapsed && <Text style={sb.versionText}>Nakath AI \u00b7 v2.0</Text>}
      </View>
    </Animated.View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────
var styles = StyleSheet.create({
  sidebar: {
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 24, elevation: 24,
    // height:100% is naturally achieved by being a flex child in a row container
  },
  borderRight: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    width: 1, backgroundColor: 'rgba(255,255,255,0.07)',
  },
});

var sb = StyleSheet.create({
  logoSection: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingTop: 20, paddingBottom: 14, minHeight: 72,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  logoIconWrap: {
    width: 36, height: 36, borderRadius: 11, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  logoGlowLayer: { borderRadius: 11, backgroundColor: 'rgba(251,191,36,0.25)' },
  logoImg:      { width: 36, height: 36, borderRadius: 11 },
  logoTitle: {
    fontSize: 14, fontWeight: '900', color: '#FBBF24', letterSpacing: 3.5,
    textShadowColor: 'rgba(251,191,36,0.55)',
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 9,
  },
  logoSubtitle: { fontSize: 9.5, color: 'rgba(255,255,255,0.33)', letterSpacing: 1.5, marginTop: 2 },
  collapseBtn: {
    width: 27, height: 27, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 6,
  },
  divider: { height: 1, marginHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 7 },
  navList: { paddingHorizontal: 8, paddingVertical: 4, gap: 2 },
  navItem: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 13, paddingRight: 10, paddingVertical: 10,
    position: 'relative', overflow: 'hidden', minHeight: 50, gap: 10,
  },
  navItemCollapsed: { justifyContent: 'center', paddingRight: 0, gap: 0 },
  navPill: { borderRadius: 13, overflow: 'hidden' },
  navPillBorder: { ...StyleSheet.absoluteFillObject, borderRadius: 13, borderWidth: 1 },
  navIndicator: { position: 'absolute', left: 0, top: 10, bottom: 10, borderRadius: 2, flexShrink: 0 },
  navIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 8,
  },
  navTextWrap: { flex: 1, minWidth: 0 },
  navLabel: { fontSize: 12.5, fontWeight: '700', color: 'rgba(255,255,255,0.68)', letterSpacing: 0.3 },
  navDesc:  { fontSize: 9.5, color: 'rgba(255,255,255,0.26)', marginTop: 2, letterSpacing: 0.2 },
  activeDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  bottomSection: { paddingHorizontal: 8, paddingBottom: 18, gap: 8 },
  balanceChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 9, marginHorizontal: 4,
  },
  balanceText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  langBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, overflow: 'hidden', borderRadius: 11,
    paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 4, minHeight: 40,
  },
  langText:    { fontSize: 12, fontWeight: '700', color: '#FFF', letterSpacing: 0.5 },
  versionText: {
    fontSize: 9, color: 'rgba(255,255,255,0.18)', textAlign: 'center',
    letterSpacing: 1, marginTop: 4, textTransform: 'uppercase',
  },
});

var top = StyleSheet.create({
  bar: {
    height: TOPBAR_H, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(8,5,22,0.97)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
    paddingRight: 24, position: 'relative', overflow: 'hidden',
  },
  accentStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, opacity: 0.8 },
  logoText: { fontSize: 12, fontWeight: '800', color: '#FBBF24', letterSpacing: 2, textTransform: 'uppercase' },
  leftDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 4 },
  leftGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 20, gap: 12 },
  iconCircle: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: {
    fontSize: 14, fontWeight: '800', color: '#F1F5F9',
    letterSpacing: 2, textTransform: 'uppercase',
  },
  sectionDesc:  { fontSize: 10.5, color: 'rgba(255,255,255,0.33)', letterSpacing: 0.3, marginTop: 1 },
  rightGroup:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  clockPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  clockText:  { fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: '600', letterSpacing: 0.5 },
  balancePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(251,191,36,0.07)',
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.28)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  langToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  langToggleText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '700', letterSpacing: 0.5 },
  balanceVal: { fontSize: 11, fontWeight: '700', color: '#FBBF24', letterSpacing: 0.3 },
});
