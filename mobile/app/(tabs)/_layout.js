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
  withSequence, interpolate, Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle, Ellipse, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Colors } from '../../constants/theme';
import DesktopSidebar from '../../components/DesktopLayout';
import useIsDesktop from '../../hooks/useIsDesktop';
import { TAB_ICON_MAP } from '../../components/TabIcons';
var { width: SW } = Dimensions.get('window');
var LOGO = require('../../assets/logo.png');

// 5 visible tabs in orbital nav bar
var TABS = [
  { name: 'kendara',  titleKey: 'tabKendara',  label: 'Chart' },
  { name: 'report',   titleKey: 'tabReport',   label: 'Starbase' },
  { name: 'index',    titleKey: 'tabHome',     label: 'Today' },
  { name: 'porondam', titleKey: 'tabPorondam', label: 'Match' },
  { name: 'chat',     titleKey: 'tabChat',     label: 'Guide' },
];

// Profile lives in the header avatar, not the bar
var HIDDEN_ROUTES = ['profile'];

var CENTER_IDX = 2;
var ORB_ICON_SZ = 22;
var CENTER_ICON_SZ = 28;
var NODE_SZ = 48;
var CENTER_NODE_SZ = 60;
var BAR_H = 80;
var ARC_HEIGHT = 22;
// Total visual height inc. overflow for arc
export var TAB_BAR_VISUAL_HEIGHT = BAR_H + ARC_HEIGHT + 20;

// Arc Y-offsets: parabolic curve — center is highest
function arcOffset(idx, total) {
  var mid = (total - 1) / 2;
  var norm = (idx - mid) / mid; // -1 to 1
  return ARC_HEIGHT * norm * norm; // 0 at center, ARC_HEIGHT at edges
}

function OrbitalNode({ tabConfig, focused, onPress, label, isCenter, index, total }) {
  var scale = useSharedValue(1);
  var prev = useRef(false);
  var sz = isCenter ? CENTER_NODE_SZ : NODE_SZ;
  var iconSz = isCenter ? CENTER_ICON_SZ : ORB_ICON_SZ;
  var yOff = arcOffset(index, total);

  useEffect(function () {
    if (focused && !prev.current) {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      scale.value = withSequence(
        withSpring(1.15, { damping: 8, stiffness: 380 }),
        withSpring(1, { damping: 14 })
      );
    }
    prev.current = focused;
  }, [focused]);

  var nodeAnim = useAnimatedStyle(function () {
    return { transform: [{ scale: scale.value }] };
  });

  var IconComponent = TAB_ICON_MAP[tabConfig.name];

  // Focused: glowing accent, unfocused: dim muted
  var bgColor = focused
    ? (isCenter ? 'rgba(147,51,234,0.35)' : 'rgba(147,51,234,0.22)')
    : 'rgba(30,26,60,0.70)';
  var borderColor = focused
    ? (isCenter ? 'rgba(147,51,234,0.65)' : 'rgba(147,51,234,0.45)')
    : 'rgba(80,70,130,0.30)';
  var iconColor = focused ? '#E0DAFF' : 'rgba(160,150,200,0.50)';
  var labelColor = focused ? '#E0DAFF' : 'rgba(160,150,200,0.50)';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[orb.nodeWrap, { marginTop: yOff }]}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Animated.View style={[orb.node, {
        width: sz,
        height: sz,
        borderRadius: sz / 2,
        backgroundColor: bgColor,
        borderColor: borderColor,
      }, isCenter && orb.centerNode, nodeAnim]}>
        {focused && isCenter && (
          <View style={[orb.centerGlow, {
            width: sz + 16,
            height: sz + 16,
            borderRadius: (sz + 16) / 2,
          }]} />
        )}
        {IconComponent ? (
          <IconComponent size={iconSz} color={iconColor} focused={focused} />
        ) : null}
      </Animated.View>
      <Text
        numberOfLines={1}
        style={[orb.label, { color: labelColor }, focused && { fontWeight: '700' }, isCenter && { fontSize: 11 }]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Orbital ring SVG ─────────────────────────────────────────
function OrbitalRing({ width }) {
  var h = BAR_H + ARC_HEIGHT;
  var padX = 32;
  var startX = padX;
  var endX = width - padX;
  var midX = width / 2;
  // Quadratic bezier arc
  var startY = h - 20;
  var endY = h - 20;
  var cpY = 8; // control point Y — higher = more curve
  var d = 'M' + startX + ',' + startY + ' Q' + midX + ',' + cpY + ' ' + endX + ',' + endY;
  return (
    <Svg width={width} height={h} style={orb.ringSvg}>
      <Defs>
        <RadialGradient id="orbGlow" cx="50%" cy="30%" r="60%">
          <Stop offset="0%" stopColor="#9333EA" stopOpacity={0.12} />
          <Stop offset="100%" stopColor="#9333EA" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={midX} cy={h - 10} rx={width * 0.38} ry={28} fill="url(#orbGlow)" />
      <Path d={d} fill="none" stroke="rgba(147,51,234,0.18)" strokeWidth={1.2} />
      <Path d={d} fill="none" stroke="rgba(147,51,234,0.08)" strokeWidth={3} />
    </Svg>
  );
}

// ─── Orbital Nav Bar ──────────────────────────────────────────
function OrbitalNavBar({ state, navigation }) {
  var { t } = useLanguage();
  var { colors } = useTheme();
  var insets = useSafeAreaInsets();
  var bottomPad = Math.max(insets.bottom, 6);

  return (
    <View style={[orb.outerWrap, { paddingBottom: bottomPad }]}>
      {/* Background blur + gradient */}
      <View style={orb.barBg}>
        {Platform.OS !== 'web' ? (
          <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderTopLeftRadius: 28, borderTopRightRadius: 28 }]}>
            <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={['rgba(18,14,40,0.50)', 'rgba(12,9,30,0.85)', 'rgba(8,5,22,0.95)']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            />
          </View>
        ) : (
          <LinearGradient
            colors={['rgba(18,14,40,0.85)', 'rgba(12,9,30,0.95)']}
            style={[StyleSheet.absoluteFill, { borderTopLeftRadius: 28, borderTopRightRadius: 28 }]}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          />
        )}
        {/* Top accent line */}
        <LinearGradient
          colors={['transparent', 'rgba(147,51,234,0.40)', 'rgba(147,51,234,0.60)', 'rgba(147,51,234,0.40)', 'transparent']}
          style={orb.topEdge}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
        />
      </View>

      {/* Orbital ring behind nodes */}
      <OrbitalRing width={SW} />

      {/* Tab nodes */}
      <View style={orb.nodesRow}>
        {TABS.map(function (tabConfig, idx) {
          var route = state.routes.find(function (r) { return r.name === tabConfig.name; });
          if (!route) return null;
          var isFocused = state.index === state.routes.indexOf(route);
          var label = t(tabConfig.titleKey) || tabConfig.label;
          var isCenter = idx === CENTER_IDX;
          function onPress() {
            var event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          }
          return (
            <OrbitalNode
              key={route.key}
              tabConfig={tabConfig}
              focused={isFocused}
              onPress={onPress}
              label={label}
              isCenter={isCenter}
              index={idx}
              total={TABS.length}
            />
          );
        })}
      </View>
    </View>
  );
}

var orb = StyleSheet.create({
  outerWrap: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  barBg: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: BAR_H + ARC_HEIGHT + 10,
    borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden',
    borderTopWidth: 1, borderTopColor: 'rgba(147,51,234,0.25)',
    borderLeftWidth: 0.5, borderLeftColor: 'rgba(147,51,234,0.10)',
    borderRightWidth: 0.5, borderRightColor: 'rgba(147,51,234,0.10)',
    ...boxShadow('rgba(147,51,234,0.15)', { width: 0, height: -8 }, 1, 24),
    elevation: 16,
  },
  topEdge: { position: 'absolute', top: 0, left: 20, right: 20, height: 1.5, borderRadius: 1 },
  ringSvg: { position: 'absolute', bottom: 0, left: 0 },
  nodesRow: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around',
    paddingHorizontal: 10, height: BAR_H + ARC_HEIGHT, paddingBottom: 6,
  },
  nodeWrap: { alignItems: 'center', justifyContent: 'flex-end', flex: 1, paddingBottom: 2 },
  node: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
    ...boxShadow('rgba(147,51,234,0.25)', { width: 0, height: 2 }, 0.8, 10),
    elevation: 6,
  },
  centerNode: {
    ...boxShadow('rgba(147,51,234,0.35)', { width: 0, height: 4 }, 1, 16),
    elevation: 10,
  },
  centerGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(147,51,234,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(147,51,234,0.12)',
  },
  label: { fontSize: 10, fontWeight: '600', marginTop: 5, letterSpacing: 0.3, textAlign: 'center' },
});

function HeaderTitle({ title }) {
  var { colors } = useTheme();
  return (
    <View style={hs.wrap}>
      <Image source={LOGO} style={hs.logoIcon} resizeMode="contain" />
      <Text style={[hs.title, { color: '#E0DAFF' }]}>{title}</Text>
    </View>
  );
}

function ProfileAvatar() {
  var router = useRouter();
  var { user } = useAuth();
  var { colors } = useTheme();
  var rawName = (user && (user.displayName || user.email)) || '';
  var firstChar = String(rawName).trim().charAt(0).toUpperCase();
  var initial = firstChar || 'A';
  return (
    <TouchableOpacity
      onPress={function () { router.push('/(tabs)/profile'); }}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel="Profile"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[hs.avatarBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.accent + '88' }]}
    >
      {user && user.photoURL ? (
        <Image source={{ uri: user.photoURL }} style={hs.avatarImg} />
      ) : (
        <Text style={[hs.avatarInitial, { color: colors.textPrimary }]}>{initial}</Text>
      )}
    </TouchableOpacity>
  );
}

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
function TabCrossfade() {
  var pathname = usePathname();
  var { colors } = useTheme();
  var fadeOp = useSharedValue(0);
  var prevPath = useRef(pathname);

  useEffect(function () {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname;
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
      backgroundColor: colors.bg, zIndex: 9999,
    }, overlayStyle]} pointerEvents="none" />
  );
}

export default function TabLayout() {
  var { t, language, toggleLanguage } = useLanguage();
  var { user } = useAuth();
  var { colors } = useTheme();
  var [tokenBalance, setTokenBalance] = useState(null);
  var [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  var isDesktop = useIsDesktop();

  var refreshBalance = useCallback(function () {
    api.getTokenBalance()
      .then(function (res) { if (res && res.balance !== undefined) setTokenBalance(res.balance); })
      .catch(function () {});
  }, []);

  useEffect(function () { refreshBalance(); }, [user, refreshBalance]);

  var TAB_BAR_HEIGHT = BAR_H + ARC_HEIGHT + 10;

  if (isDesktop) {
    return (
      <View style={[ds.shell, { backgroundColor: colors.bg }]}>
        <DesktopSidebarStandalone balance={tokenBalance} language={language}
          onToggleLanguage={toggleLanguage} onCollapseChange={setSidebarCollapsed} />
        <View style={[ds.contentCol, { backgroundColor: colors.bg }]}>
          <Tabs tabBar={function () { return null; }} sceneContainerStyle={[ds.sceneContainer, { backgroundColor: colors.bg }]}
            screenOptions={{ headerShown: false }}>
            <Tabs.Screen key="index" name="index" options={{ title: t('tabHome') }} />
            {TABS.filter(function (tab) { return tab.name !== 'index'; }).map(function (tab) {
              return <Tabs.Screen key={tab.name} name={tab.name}
                options={{ title: t(tab.titleKey) }} />;
            })}
            {HIDDEN_ROUTES.map(function (name) {
              return <Tabs.Screen key={name} name={name} options={{ title: t('tabProfile') }} />;
            })}
          </Tabs>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Tabs
        tabBar={function (props) { return <OrbitalNavBar {...props} />; }}
        sceneContainerStyle={{ backgroundColor: colors.bg }}
        screenOptions={function ({ route }) {
          return {
            headerShown: true, headerTransparent: true, headerTitleAlign: 'center',
            tabBarStyle: { height: TAB_BAR_HEIGHT },
            tabBarHideOnKeyboard: true,
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
            return <ThemedHeaderBackground />;
          },
          headerRight: function () { return <ProfileAvatar />; },
        };
      }}
    >
      <Tabs.Screen key="index" name="index" options={{ title: t('tabHome') }} />
      {TABS.filter(function (tab) { return tab.name !== 'index'; }).map(function (tab) {
        var extraOpts = {};
        if (tab.name === 'chat') extraOpts.headerShown = false;
        return <Tabs.Screen key={tab.name} name={tab.name}
          options={Object.assign({ title: t(tab.titleKey) }, extraOpts)} />;
      })}
      {HIDDEN_ROUTES.map(function (name) {
        return <Tabs.Screen key={name} name={name} options={{ href: null, title: t('tabProfile') }} />;
      })}
    </Tabs>
    <TabCrossfade />
    </View>
  );
}

var hs = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon: { width: 22, height: 22, borderRadius: 6 },
  title: { fontSize: 15, fontWeight: '800', letterSpacing: 2.5, textTransform: 'uppercase' },
  avatarBtn: { width: 34, height: 34, borderRadius: 17, marginRight: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarInitial: { fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
});

function ThemedHeaderBackground() {
  var { colors } = useTheme();
  if (Platform.OS === 'web') {
    return (
      <View style={[StyleSheet.absoluteFillObject, {
        backgroundColor: 'rgba(26,23,48,0.94)',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }]} />
    );
  }
  return (
    <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['rgba(26,23,48,0.95)', 'rgba(19,16,42,0.65)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 0.5, backgroundColor: colors.border }} />
    </BlurView>
  );
}

var ds = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', backgroundColor: Colors.deepVoid, overflow: 'hidden' },
  contentCol: { flex: 1, flexDirection: 'column', backgroundColor: Colors.deepVoid, overflow: 'hidden' },
  sceneContainer: { flex: 1, backgroundColor: Colors.deepVoid, overflow: 'hidden' },
});
