import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Tabs, useRouter, usePathname } from 'expo-router';
import {
  View, StyleSheet, Platform, Text, Dimensions,
  TouchableOpacity, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { boxShadow, textShadow } from '../../utils/shadow';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withSequence, withRepeat, withDelay, interpolate, Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Colors } from '../../constants/theme';
import DesktopSidebar from '../../components/DesktopLayout';
import useIsDesktop from '../../hooks/useIsDesktop';
import { TAB_ICON_MAP } from '../../components/TabIcons';
var { width: SW } = Dimensions.get('window');
var LOGO = require('../../assets/logo.png');

var TABS = [
  { name: 'index', title: 'Today', titleSi: '\u0D85\u0DAF', color: '#D4A056', bg: 'rgba(212,160,86,0.12)' },
  { name: 'kendara', title: 'Chart', titleSi: '\u0D9A\u0DDA\u0DB1\u0DCA\u0DAF\u0DBB\u0DDA', color: '#7B9CC4', bg: 'rgba(123,156,196,0.12)' },
  { name: 'report', title: 'Report', titleSi: '\u0DC0\u0DCF\u0DBB\u0DCA\u0DAD\u0DCF\u0DC0', color: '#D4A056', bg: 'rgba(212,160,86,0.15)' },
  { name: 'chat', title: 'Guide', titleSi: '\u0DB8\u0DCF\u0DBB\u0DCA\u0D9C\u0DBA', color: '#7B9CC4', bg: 'rgba(123,156,196,0.12)' },
  { name: 'porondam', title: 'Match', titleSi: '\u0DB4\u0DDC\u0DBB\u0DDC\u0DB1\u0DCA\u0DAF\u0DB8', color: '#9B8ABF', bg: 'rgba(155,138,191,0.12)' },
  { name: 'profile', title: 'Aura', titleSi: '\u0DB8\u0DB8', color: '#7B9CC4', bg: 'rgba(123,156,196,0.12)' },
];

var NODE_OFFSETS = [14, 42, 18, 38, 28, 54];
var NODE_SZ = 44;
var BAR_H = 105;
var ICON_SZ = 24;

function NavNode({ tabConfig, focused, onPress, label, yOffset }) {
  var scale = useSharedValue(1);
  var glowOp = useSharedValue(focused ? 1 : 0);
  var prev = useRef(false);

  useEffect(function () {
    if (focused && !prev.current) {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      scale.value = withSequence(withSpring(1.15, { damping: 6, stiffness: 500 }), withSpring(1, { damping: 14 }));
      glowOp.value = withSpring(1, { damping: 14 });
    } else if (!focused && prev.current) {
      scale.value = withSpring(1, { damping: 14 });
      glowOp.value = withTiming(0, { duration: 250 });
    }
    prev.current = focused;
  }, [focused]);

  var nodeAnim = useAnimatedStyle(function () {
    return { transform: [{ scale: scale.value }] };
  });
  var glowAnim = useAnimatedStyle(function () {
    return { opacity: interpolate(glowOp.value, [0, 1], [0, 0.8]) };
  });

  var IconComponent = TAB_ICON_MAP[tabConfig.name];

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}
      style={[nb.nodeWrap, { marginBottom: yOffset }]}>
      <Animated.View style={[nb.glowRing, {
        width: NODE_SZ + 18, height: NODE_SZ + 18, borderRadius: (NODE_SZ + 18) / 2,
        backgroundColor: tabConfig.color + '18',
      }, glowAnim]} />
      <Animated.View style={[nb.node, {
        width: NODE_SZ, height: NODE_SZ, borderRadius: NODE_SZ / 2,
        borderColor: focused ? tabConfig.color + '70' : 'rgba(255,255,255,0.07)',
        backgroundColor: focused ? tabConfig.bg : 'rgba(10,8,22,0.85)',
      }, nodeAnim]}>
        {IconComponent ? (
          <IconComponent size={ICON_SZ} color={tabConfig.color} focused={focused} />
        ) : null}
      </Animated.View>
      <Text style={[nb.label, focused && { color: tabConfig.color, opacity: 1 }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Flickering Stars for Navbar ─────────────────────────────────
var STAR_DATA = [
  { x: 0.06, y: 0.18, r: 1.0, delay: 0 },
  { x: 0.12, y: 0.55, r: 0.7, delay: 400 },
  { x: 0.19, y: 0.30, r: 0.9, delay: 800 },
  { x: 0.25, y: 0.72, r: 0.6, delay: 200 },
  { x: 0.32, y: 0.15, r: 1.1, delay: 1100 },
  { x: 0.38, y: 0.60, r: 0.8, delay: 600 },
  { x: 0.44, y: 0.40, r: 0.5, delay: 1400 },
  { x: 0.50, y: 0.22, r: 0.9, delay: 300 },
  { x: 0.56, y: 0.68, r: 0.7, delay: 900 },
  { x: 0.62, y: 0.35, r: 1.0, delay: 1200 },
  { x: 0.68, y: 0.58, r: 0.6, delay: 500 },
  { x: 0.74, y: 0.20, r: 0.8, delay: 1000 },
  { x: 0.80, y: 0.70, r: 0.5, delay: 700 },
  { x: 0.86, y: 0.42, r: 1.0, delay: 1300 },
  { x: 0.92, y: 0.25, r: 0.7, delay: 150 },
  { x: 0.15, y: 0.80, r: 0.6, delay: 1500 },
  { x: 0.48, y: 0.12, r: 0.8, delay: 850 },
  { x: 0.72, y: 0.48, r: 0.5, delay: 450 },
];

function FlickeringStar({ x, y, r, delay, barW, barH }) {
  var opacity = useSharedValue(0.08);
  useEffect(function () {
    opacity.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(0.6 + Math.random() * 0.4, { duration: 800 + Math.random() * 1200 }),
        withTiming(0.05 + Math.random() * 0.1, { duration: 600 + Math.random() * 1000 })
      ), -1, true
    ));
  }, []);
  var style = useAnimatedStyle(function () {
    return {
      opacity: opacity.value,
      position: 'absolute',
      left: barW * x - r,
      top: barH * y - r,
      width: r * 2,
      height: r * 2,
      borderRadius: r,
      backgroundColor: '#fff',
    };
  });
  return <Animated.View style={style} />;
}

function FlickeringStars({ barW, barH }) {
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, width: barW, height: barH }}>
      {STAR_DATA.map(function (s, i) {
        return <FlickeringStar key={i} x={s.x} y={s.y} r={s.r} delay={s.delay} barW={barW} barH={barH} />;
      })}
    </View>
  );
}

function StarbaseNavBar({ state, descriptors, navigation }) {
  var { language } = useLanguage();
  var insets = useSafeAreaInsets();
  var bottomPad = Math.max(insets.bottom, 4);
  var barW = SW;
  var tabCount = TABS.length;
  var usableW = barW - 32;
  var nodePositions = TABS.map(function (_, idx) {
    var x = 16 + (usableW / (tabCount - 1)) * idx;
    var y = BAR_H - NODE_OFFSETS[idx] - NODE_SZ / 2 - 8;
    return { x: x, y: y };
  });

  return (
    <View style={[nb.outerWrap, { paddingBottom: bottomPad }]}>
      <View style={nb.barBg}>
        {Platform.OS !== 'web' ? (
          <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderTopLeftRadius: 28, borderTopRightRadius: 28 }]}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            <LinearGradient colors={['rgba(18,14,38,0.45)', 'rgba(8,6,20,0.65)', 'rgba(4,3,12,0.75)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
          </View>
        ) : (
          <LinearGradient colors={['rgba(18,14,38,0.50)', 'rgba(8,6,20,0.65)', 'rgba(4,3,12,0.75)']} style={[StyleSheet.absoluteFill, { borderTopLeftRadius: 28, borderTopRightRadius: 28 }]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
        )}
        {/* Embossed top highlight — bright edge at the top */}
        <LinearGradient colors={['rgba(212,160,86,0.25)', 'rgba(255,255,255,0.10)', 'transparent']} style={nb.highlight3d} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
        {/* Inner shadow — darker strip below the highlight for depth */}
        <LinearGradient colors={['rgba(0,0,0,0.25)', 'transparent']} style={nb.innerShadow} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
        {/* Soft bottom bevel — lighter reflection at the very bottom */}
        <LinearGradient colors={['transparent', 'rgba(255,255,255,0.04)']} style={nb.bottomBevel} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
        <View style={nb.arcLayer} pointerEvents="none">
          <FlickeringStars barW={barW} barH={BAR_H} />
        </View>
        <LinearGradient colors={['transparent', 'rgba(212,160,86,0.18)', 'rgba(155,138,191,0.10)', 'rgba(123,156,196,0.12)', 'transparent']} style={nb.topEdge} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} />
      </View>
      <View style={nb.nodesRow}>
        {TABS.map(function (tabConfig, idx) {
          var route = state.routes.find(function (r) { return r.name === tabConfig.name; });
          if (!route) return null;
          var isFocused = state.index === state.routes.indexOf(route);
          var label = language === 'si' ? tabConfig.titleSi : tabConfig.title;
          function onPress() {
            var event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          }
          return <NavNode key={route.key} tabConfig={tabConfig} focused={isFocused} onPress={onPress} label={label} yOffset={NODE_OFFSETS[idx]} />;
        })}
      </View>
    </View>
  );
}

var nb = StyleSheet.create({
  outerWrap: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  barBg: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: BAR_H + 20,
    borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden',
    borderTopWidth: 1.5, borderLeftWidth: 0.8, borderRightWidth: 0.8,
    borderTopColor: 'rgba(212,160,86,0.22)', borderLeftColor: 'rgba(255,255,255,0.06)', borderRightColor: 'rgba(255,255,255,0.06)',
    ...boxShadow('rgba(0,0,0,0.7)', { width: 0, height: -10 }, 0.9, 30),
    elevation: 24,
  },
  highlight3d: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 6,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
  },
  innerShadow: {
    position: 'absolute', top: 4, left: 0, right: 0, height: 8,
  },
  bottomBevel: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 12,
  },
  arcLayer: { position: 'absolute', top: 0, left: 0, right: 0, height: BAR_H },
  topEdge: { position: 'absolute', top: 0, left: 16, right: 16, height: 2, borderRadius: 1 },
  nodesRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', paddingHorizontal: 8, height: BAR_H, paddingBottom: 2 },
  nodeWrap: { alignItems: 'center', justifyContent: 'flex-end', flex: 1 },
  node: {
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
    ...boxShadow('rgba(0,0,0,0.6)', { width: 0, height: 5 }, 0.7, 14),
    elevation: 10,
  },
  glowRing: { position: 'absolute', top: -9 },
  label: { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.22)', marginTop: 4, letterSpacing: 0.4 },
});

function HeaderTitle({ title }) {
  return (
    <View style={hs.wrap}>
      <Image source={LOGO} style={hs.logoIcon} resizeMode="contain" />
      <Text style={hs.title}>{title}</Text>
    </View>
  );
}

function BalancePill() { return null; }

function DesktopSidebarStandalone({ balance, language, onToggleLanguage, onCollapseChange }) {
  var router = useRouter();
  var pathname = usePathname();
  var routeIndex = TABS.findIndex(function (t) {
    var seg = pathname === '/' ? 'index' : pathname.replace(/^\//, '').split('/')[0];
    return t.name === seg || (seg === '' && t.name === 'index');
  });
  var activeIndex = routeIndex < 0 ? 0 : routeIndex;
  var fakeState = { index: activeIndex, routes: TABS.map(function (t) { return { name: t.name, key: t.name }; }) };
  var fakeNavigation = {
    emit: function () { return { defaultPrevented: false }; },
    navigate: function (name) { router.push('/' + (name === 'index' ? '' : name)); },
  };
  return (
    <DesktopSidebar state={fakeState} navigation={fakeNavigation} balance={balance}
      language={language} onToggleLanguage={onToggleLanguage} onCollapseChange={onCollapseChange} />
  );
}

// ─── Tab Crossfade Overlay ──────────────────────────────────────
// Triggers a brief fade-in/fade-out dark overlay when switching tabs
// creating a smooth dissolve blend between pages
function TabCrossfade() {
  var pathname = usePathname();
  var fadeOp = useSharedValue(0);
  var prevPath = useRef(pathname);

  useEffect(function () {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname;
      // Quick fade in then out — dissolve effect
      fadeOp.value = 0;
      fadeOp.value = withSequence(
        withTiming(0.7, { duration: 120, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 280, easing: Easing.in(Easing.quad) })
      );
    }
  }, [pathname]);

  var overlayStyle = useAnimatedStyle(function () {
    return {
      opacity: fadeOp.value,
      pointerEvents: 'none',
    };
  });

  return (
    <Animated.View style={[{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: '#040818', zIndex: 9999,
    }, overlayStyle]} pointerEvents="none" />
  );
}

export default function TabLayout() {
  var { t, language, toggleLanguage } = useLanguage();
  var { user } = useAuth();
  var [tokenBalance, setTokenBalance] = useState(null);
  var [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  var isDesktop = useIsDesktop();

  var refreshBalance = useCallback(function () {
    api.getTokenBalance()
      .then(function (res) { if (res && res.balance !== undefined) setTokenBalance(res.balance); })
      .catch(function () {});
  }, []);

  useEffect(function () { refreshBalance(); }, [user, refreshBalance]);

  var TAB_BAR_HEIGHT = BAR_H + 20;

  if (isDesktop) {
    return (
      <View style={ds.shell}>
        <DesktopSidebarStandalone balance={tokenBalance} language={language}
          onToggleLanguage={toggleLanguage} onCollapseChange={setSidebarCollapsed} />
        <View style={ds.contentCol}>
          <Tabs tabBar={function () { return null; }} sceneContainerStyle={ds.sceneContainer}
            screenOptions={{ headerShown: false }}>
            {TABS.map(function (tab) {
              return <Tabs.Screen key={tab.name} name={tab.name}
                options={{ title: language === 'si' ? tab.titleSi : tab.title }} />;
            })}
          </Tabs>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={function (props) { return <StarbaseNavBar {...props} />; }}
        sceneContainerStyle={{ backgroundColor: '#010208' }}
        screenOptions={function ({ route }) {
          return {
            headerShown: true, headerTransparent: true, headerTitleAlign: 'center',
            tabBarStyle: { height: TAB_BAR_HEIGHT },
            animation: 'none',
            lazy: false,
          headerTitle: function () {
            var tabKey = 'tabHome';
            if (route.name === 'porondam') tabKey = 'tabPorondam';
            if (route.name === 'kendara') tabKey = 'tabKendara';
            if (route.name === 'report') tabKey = 'tabReport';
            if (route.name === 'chat') tabKey = 'tabChat';
            if (route.name === 'profile') tabKey = 'tabProfile';
            return <HeaderTitle title={t(tabKey)} />;
          },
          headerBackground: function () {
            if (Platform.OS === 'web') return <View style={hs.webBg} />;
            return (
              <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill}>
                <LinearGradient colors={['rgba(8,5,18,0.95)', 'rgba(10,7,20,0.60)']} style={StyleSheet.absoluteFill} />
                <View style={hs.borderLine} />
              </BlurView>
            );
          },
          headerRight: function () { return <BalancePill />; },
        };
      }}
    >
      {TABS.map(function (tab) {
        var extraOpts = {};
        if (tab.name === 'chat') extraOpts.headerShown = false;
        return <Tabs.Screen key={tab.name} name={tab.name}
          options={Object.assign({ title: language === 'si' ? tab.titleSi : tab.title }, extraOpts)} />;
      })}
    </Tabs>
    <TabCrossfade />
    </View>
  );
}

var hs = StyleSheet.create({
  webBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,5,18,0.96)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  borderLine: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 0.5, backgroundColor: 'rgba(255,255,255,0.06)' },
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon: { width: 22, height: 22, borderRadius: 6 },
  title: { fontSize: 15, fontWeight: '800', color: '#E0DAFF', letterSpacing: 2.5, textTransform: 'uppercase', ...textShadow('rgba(167,139,250,0.4)', { width: 0, height: 0 }, 8) },
});

var ds = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', backgroundColor: Colors.deepVoid, overflow: 'hidden' },
  contentCol: { flex: 1, flexDirection: 'column', backgroundColor: Colors.deepVoid, overflow: 'hidden' },
  sceneContainer: { flex: 1, backgroundColor: Colors.deepVoid, overflow: 'hidden' },
});
