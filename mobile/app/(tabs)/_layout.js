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
  { name: 'index', title: 'Today', titleSi: '\u0D85\u0DAF', color: '#D4A056', bg: 'rgba(212,160,86,0.14)' },
  { name: 'kendara', title: 'Chart', titleSi: '\u0D9A\u0DDA\u0DB1\u0DCA\u0DAF\u0DBB\u0DDA', color: '#7B9CC4', bg: 'rgba(123,156,196,0.14)' },
  { name: 'report', title: 'Report', titleSi: '\u0DC0\u0DCF\u0DBB\u0DCA\u0DAD\u0DCF\u0DC0', color: '#E8C07A', bg: 'rgba(232,192,122,0.16)' },
  { name: 'chat', title: 'Guide', titleSi: '\u0DB8\u0DCF\u0DBB\u0DCA\u0D9C\u0DBA', color: '#7B9CC4', bg: 'rgba(123,156,196,0.14)' },
  { name: 'porondam', title: 'Match', titleSi: '\u0DB4\u0DDC\u0DBB\u0DDC\u0DB1\u0DCA\u0DAF\u0DB8', color: '#9B8ABF', bg: 'rgba(155,138,191,0.14)' },
  { name: 'profile', title: 'Aura', titleSi: '\u0DB8\u0DB8', color: '#7B9CC4', bg: 'rgba(123,156,196,0.14)' },
];

var NODE_OFFSETS = [14, 42, 18, 38, 28, 54];
var NODE_SZ = 44;
var BAR_H = 105;
var ICON_SZ = 24;

function NavNode({ tabConfig, focused, onPress, label, yOffset }) {
  var scale = useSharedValue(1);
  var glowOp = useSharedValue(focused ? 1 : 0);
  var halo = useSharedValue(focused ? 1 : 0);
  var prev = useRef(false);

  // Continuous breathing pulse on focused node
  useEffect(function () {
    if (focused) {
      halo.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.55, { duration: 1600, easing: Easing.inOut(Easing.sin) })
        ),
        -1, true
      );
    } else {
      halo.value = withTiming(0, { duration: 260 });
    }
  }, [focused]);

  useEffect(function () {
    if (focused && !prev.current) {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      scale.value = withSequence(
        withSpring(1.18, { damping: 6, stiffness: 520 }),
        withSpring(1, { damping: 14 })
      );
      glowOp.value = withSpring(1, { damping: 14 });
    } else if (!focused && prev.current) {
      scale.value = withSpring(1, { damping: 14 });
      glowOp.value = withTiming(0, { duration: 260 });
    }
    prev.current = focused;
  }, [focused]);

  var nodeAnim = useAnimatedStyle(function () {
    return { transform: [{ scale: scale.value }] };
  });
  var glowAnim = useAnimatedStyle(function () {
    return { opacity: interpolate(glowOp.value, [0, 1], [0, 0.95]) };
  });
  // Outer breathing halo (premium pulse)
  var haloAnim = useAnimatedStyle(function () {
    return {
      opacity: interpolate(halo.value, [0, 1], [0, 0.55]),
      transform: [{ scale: interpolate(halo.value, [0, 1], [0.85, 1.22]) }],
    };
  });
  // Inner bright ring (steady when focused)
  var ringAnim = useAnimatedStyle(function () {
    return { opacity: interpolate(glowOp.value, [0, 1], [0, 1]) };
  });

  var IconComponent = TAB_ICON_MAP[tabConfig.name];

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}
      style={[nb.nodeWrap, { marginBottom: yOffset }]}>
      {/* Outer breathing halo — soft colored bloom */}
      <Animated.View pointerEvents="none" style={[nb.outerHalo, {
        width: NODE_SZ + 34, height: NODE_SZ + 34, borderRadius: (NODE_SZ + 34) / 2,
        backgroundColor: tabConfig.color + '22',
      }, haloAnim]} />
      {/* Mid glow — stronger bloom close to the node */}
      <Animated.View pointerEvents="none" style={[nb.glowRing, {
        width: NODE_SZ + 20, height: NODE_SZ + 20, borderRadius: (NODE_SZ + 20) / 2,
        backgroundColor: tabConfig.color + '2A',
        shadowColor: tabConfig.color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 16,
        elevation: 0,
      }, glowAnim]} />
      {/* Thin bright accent ring just outside node border */}
      <Animated.View pointerEvents="none" style={[nb.accentRing, {
        width: NODE_SZ + 8, height: NODE_SZ + 8, borderRadius: (NODE_SZ + 8) / 2,
        borderColor: tabConfig.color + 'AA',
      }, ringAnim]} />
      {/* Node itself */}
      <Animated.View style={[nb.node, {
        width: NODE_SZ, height: NODE_SZ, borderRadius: NODE_SZ / 2,
        borderColor: focused ? tabConfig.color : tabConfig.color + '55',
        borderWidth: focused ? 1.5 : 1.2,
        shadowColor: focused ? tabConfig.color : '#000',
        shadowOpacity: focused ? 0.8 : 0.5,
        shadowRadius: focused ? 12 : 6,
      }, nodeAnim]}>
        {/* Node gradient fill */}
        <LinearGradient
          colors={focused
            ? [tabConfig.color + '40', tabConfig.color + '20', 'rgba(10,8,22,0.55)']
            : [tabConfig.color + '18', 'rgba(16,12,28,0.85)', 'rgba(8,6,18,0.95)']}
          style={[StyleSheet.absoluteFill, { borderRadius: NODE_SZ / 2 }]}
          start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }}
        />
        {/* Inner highlight (glossy top) */}
        <LinearGradient
          colors={focused
            ? ['rgba(255,255,255,0.26)', 'transparent']
            : ['rgba(255,255,255,0.10)', 'transparent']}
          style={[StyleSheet.absoluteFill, { borderRadius: NODE_SZ / 2 }]}
          start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.6 }}
        />
        {IconComponent ? (
          <IconComponent size={ICON_SZ} color={focused ? '#FFF' : tabConfig.color} focused={focused} />
        ) : null}
      </Animated.View>
      <Text
        numberOfLines={1}
        style={[
          nb.label,
          { color: tabConfig.color + 'BB' },
          focused && { color: tabConfig.color, opacity: 1, fontWeight: '700', ...textShadow(tabConfig.color + '66', { width: 0, height: 0 }, 6) },
        ]}
      >
        {label}
      </Text>
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

// ─── Gold shimmer sweep along top edge ───────────────────────────
function TopShimmer({ width }) {
  var progress = useSharedValue(0);
  useEffect(function () {
    progress.value = withRepeat(
      withSequence(
        withDelay(1400, withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.cubic) })),
        withTiming(1, { duration: 2200 })
      ),
      -1, false
    );
  }, []);
  var style = useAnimatedStyle(function () {
    return {
      transform: [{ translateX: interpolate(progress.value, [0, 1], [-width * 0.4, width]) }],
      opacity: interpolate(progress.value, [0, 0.15, 0.5, 0.85, 1], [0, 0.9, 1, 0.7, 0]),
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', top: 0, height: 2, width: width * 0.4 }, style]} pointerEvents="none">
      <LinearGradient
        colors={['transparent', 'rgba(232,192,122,0.55)', 'rgba(255,240,200,0.95)', 'rgba(232,192,122,0.55)', 'transparent']}
        start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

function StarbaseNavBar({ state, descriptors, navigation }) {
  var { language } = useLanguage();
  var insets = useSafeAreaInsets();
  var bottomPad = Math.max(insets.bottom, 4);
  var barW = SW;

  return (
    <View style={[nb.outerWrap, { paddingBottom: bottomPad }]}>
      <View style={nb.barBg}>
        {Platform.OS !== 'web' ? (
          <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderTopLeftRadius: 28, borderTopRightRadius: 28 }]}>
            <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
            <LinearGradient colors={['rgba(18,14,38,0.55)', 'rgba(8,6,20,0.78)', 'rgba(2,1,8,0.92)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
          </View>
        ) : (
          <LinearGradient colors={['rgba(18,14,38,0.62)', 'rgba(8,6,20,0.82)', 'rgba(2,1,8,0.95)']} style={[StyleSheet.absoluteFill, { borderTopLeftRadius: 28, borderTopRightRadius: 28 }]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
        )}
        {/* Embossed top highlight — bright edge at the top */}
        <LinearGradient colors={['rgba(232,192,122,0.35)', 'rgba(255,255,255,0.14)', 'transparent']} style={nb.highlight3d} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
        {/* Inner shadow — darker strip below the highlight for depth */}
        <LinearGradient colors={['rgba(0,0,0,0.30)', 'transparent']} style={nb.innerShadow} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
        {/* Soft bottom bevel — lighter reflection at the very bottom */}
        <LinearGradient colors={['transparent', 'rgba(255,255,255,0.05)']} style={nb.bottomBevel} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
        <View style={nb.arcLayer} pointerEvents="none">
          <FlickeringStars barW={barW} barH={BAR_H} />
        </View>
        {/* Gold hairline top edge */}
        <LinearGradient
          colors={['transparent', 'rgba(232,192,122,0.50)', 'rgba(255,240,200,0.75)', 'rgba(232,192,122,0.50)', 'transparent']}
          style={nb.topEdge}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
        />
        {/* Gold shimmer sweeping across the top */}
        <View style={nb.shimmerTrack} pointerEvents="none">
          <TopShimmer width={barW} />
        </View>
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
    borderTopWidth: 1.2, borderLeftWidth: 0.8, borderRightWidth: 0.8,
    borderTopColor: 'rgba(232,192,122,0.35)',
    borderLeftColor: 'rgba(232,192,122,0.10)',
    borderRightColor: 'rgba(232,192,122,0.10)',
    ...boxShadow('rgba(0,0,0,0.80)', { width: 0, height: -12 }, 1, 34),
    elevation: 28,
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
  topEdge: { position: 'absolute', top: 0, left: 16, right: 16, height: 1.5, borderRadius: 1 },
  shimmerTrack: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, overflow: 'hidden' },
  nodesRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', paddingHorizontal: 8, height: BAR_H, paddingBottom: 2 },
  nodeWrap: { alignItems: 'center', justifyContent: 'flex-end', flex: 1 },
  node: {
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  outerHalo: { position: 'absolute', top: -18 },
  glowRing: { position: 'absolute', top: -10 },
  accentRing: { position: 'absolute', top: -4, borderWidth: 1 },
  label: { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.55)', marginTop: 4, letterSpacing: 0.4 },
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
