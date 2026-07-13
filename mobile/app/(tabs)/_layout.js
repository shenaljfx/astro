import React, { useEffect, useRef, useState } from 'react';
import { Tabs, useRouter, usePathname } from 'expo-router';
import {
  View, StyleSheet, Platform, Text, Dimensions,
  TouchableOpacity, Image, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { boxShadow, textShadow } from '../../utils/shadow';
import { getDockHidden, subscribeDockHidden } from '../../utils/dockVisibility';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withSequence, withRepeat, interpolate, interpolateColor, Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle, Ellipse, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/theme';
import DesktopSidebar from '../../components/DesktopLayout';
import useIsDesktop from '../../hooks/useIsDesktop';
import { TAB_ICON_MAP } from '../../components/TabIcons';
import useNetworkStatus from '../../hooks/useNetworkStatus';
import useReducedMotion from '../../hooks/useReducedMotion';
import { APP_LOGO_IMAGE } from '../../assets/logo-inline';
var { width: SW } = Dimensions.get('window');
var LOGO = APP_LOGO_IMAGE;

// 5 visible tabs in orbital nav bar — each page carries its own celestial
// accent; the gliding halo morphs between them as it travels.
var TABS = [
  { name: 'kendara',  titleKey: 'tabKendara',  label: 'Chart',    color: '#A78BFA' }, // violet — the mystic chart
  { name: 'report',   titleKey: 'tabReport',   label: 'Starbase', color: '#7DD3FC' }, // sky blue — the observatory
  { name: 'index',    titleKey: 'tabHome',     label: 'Today',    color: '#FFD983' }, // gold — the sun
  { name: 'porondam', titleKey: 'tabPorondam', label: 'Match',    color: '#F5A9C7' }, // rose — the union
  { name: 'chat',     titleKey: 'tabChat',     label: 'Guide',    color: '#86EFAC' }, // jade — the living oracle
];
var TAB_ACCENTS = TABS.map(function (tb) { return tb.color; });

// Profile lives in the header avatar, not the bar
var HIDDEN_ROUTES = ['profile', 'nakath', 'baby'];

var CENTER_IDX = 2;
var DOCK_H = 64;
var DOCK_MARGIN_X = 14;
var DOCK_RADIUS = 30;
var MEDALLION = 56;
var MEDALLION_LIFT = 24; // how far the sun medallion rises above the dock
// Total visual height inc. float gap + medallion overflow (screens pad by this)
export var TAB_BAR_VISUAL_HEIGHT = DOCK_H + MEDALLION_LIFT + 22;

// quiet star dust inside the dock glass (x%, y, r, opacity)
var DOCK_STARS = [
  [8, 14, 1.1, 0.35], [19, 46, 0.8, 0.22], [31, 10, 0.9, 0.30],
  [69, 12, 0.9, 0.30], [81, 44, 0.8, 0.22], [92, 16, 1.1, 0.35],
  [42, 52, 0.7, 0.18], [58, 50, 0.7, 0.18],
];

/**
 * DockNode — a regular tab. Active: icon lifts on a spring and turns pearl,
 * label brightens. Inactive: dim, patient. The gold halo (drawn by the bar)
 * glides underneath to meet it.
 */
function DockNode({ tabConfig, focused, onPress, label }) {
  var lift = useSharedValue(focused ? 1 : 0);
  var prev = useRef(focused);
  useEffect(function () {
    if (focused && !prev.current && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    prev.current = focused;
    lift.value = withSpring(focused ? 1 : 0, { damping: 14, stiffness: 220 });
  }, [focused]);
  var liftStyle = useAnimatedStyle(function () {
    return {
      transform: [
        { translateY: interpolate(lift.value, [0, 1], [0, -4]) },
        { scale: interpolate(lift.value, [0, 1], [1, 1.08]) },
      ],
    };
  });

  var IconComponent = TAB_ICON_MAP[tabConfig.name];
  var accent = tabConfig.color || Colors.luxuryPearl;
  var iconColor = focused ? accent : 'rgba(220,207,170,0.44)';
  var labelColor = focused ? accent : 'rgba(220,207,170,0.40)';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={dock.slot}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
    >
      <Animated.View style={[dock.nodeIcon, liftStyle]}>
        {IconComponent ? <IconComponent size={23} color={iconColor} focused={focused} /> : null}
      </Animated.View>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={[dock.label, { color: labelColor }, focused && dock.labelOn]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * CenterMedallion — Today. A gold sun medallion raised half out of the dock,
 * with a corona ring that breathes. The anchor of the whole app.
 */
function CenterMedallion({ focused, onPress, label, reduced }) {
  var breath = useSharedValue(0);
  var press = useSharedValue(1);
  useEffect(function () {
    if (reduced) { breath.value = 0.5; return; }
    breath.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduced]);
  var coronaStyle = useAnimatedStyle(function () {
    return {
      transform: [{ scale: interpolate(breath.value, [0, 1], [1, 1.22]) }],
      opacity: interpolate(breath.value, [0, 1], [focused ? 0.5 : 0.22, 0.05]),
    };
  });
  var pressStyle = useAnimatedStyle(function () { return { transform: [{ scale: press.value }] }; });

  var IconComponent = TAB_ICON_MAP.index;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={function () {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        press.value = withSequence(withSpring(0.9, { damping: 12, stiffness: 400 }), withSpring(1, { damping: 12 }));
        onPress();
      }}
      style={dock.slot}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      hitSlop={{ top: 14, bottom: 10, left: 6, right: 6 }}
    >
      <Animated.View style={[dock.medWrap, pressStyle]}>
        <Animated.View style={[dock.medCorona, coronaStyle]} />
        <LinearGradient
          colors={focused ? ['#3A2A55', '#251639', '#150C22'] : ['#241833', '#180F26', '#0E0818']}
          style={[dock.medallion, focused && dock.medallionOn]}
          start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
        >
          {IconComponent ? <IconComponent size={30} color={focused ? '#FFD983' : 'rgba(244,228,188,0.7)'} focused={focused} /> : null}
        </LinearGradient>
        {/* orbit hairline around the medallion */}
        <View style={[dock.medOrbit, focused && { borderColor: 'rgba(244,228,188,0.55)' }]} pointerEvents="none" />
      </Animated.View>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={[dock.label, dock.medLabel, focused && dock.labelOn]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * OrbitalNavBar — the observatory dock. A floating glass pill above the safe
 * area; a liquid-gold halo glides on springs beneath whichever tab is alive.
 */
function OrbitalNavBar({ state, navigation }) {
  var { t } = useLanguage();
  var insets = useSafeAreaInsets();
  var reduced = useReducedMotion();
  var bottomPad = Math.max(insets.bottom, 10);

  // Hide the dock when the keyboard is open (custom bars ignore
  // tabBarHideOnKeyboard). Both will/did events so Android never flashes it.
  var [keyboardVisible, setKeyboardVisible] = useState(
    Platform.OS !== 'web' && typeof Keyboard.isVisible === 'function' ? Keyboard.isVisible() : false
  );
  useEffect(function () {
    if (Platform.OS === 'web') return;
    var show = function () { setKeyboardVisible(true); };
    var hide = function () { setKeyboardVisible(false); };
    var subs = [
      Keyboard.addListener('keyboardWillShow', show),
      Keyboard.addListener('keyboardDidShow', show),
      Keyboard.addListener('keyboardWillHide', hide),
      Keyboard.addListener('keyboardDidHide', hide),
    ];
    return function () { subs.forEach(function (s) { s.remove(); }); };
  }, []);

  // Screens can ask the dock to step aside for a full-bleed view (chat room).
  var [dockHidden, setDockHiddenState] = useState(getDockHidden());
  useEffect(function () { return subscribeDockHidden(setDockHiddenState); }, []);

  // The dock no longer unmounts — it glides: exits drop fast, returns spring
  // back up. Covers both keyboard-hide and the chat room's full-bleed mode.
  var hiddenNow = keyboardVisible || dockHidden;
  var slide = useSharedValue(hiddenNow ? 1 : 0);
  useEffect(function () {
    if (reduced) { slide.value = hiddenNow ? 1 : 0; return; }
    slide.value = hiddenNow
      ? withTiming(1, { duration: 190, easing: Easing.in(Easing.cubic) })
      : withSpring(0, { damping: 16, stiffness: 170, mass: 0.75 });
  }, [hiddenNow, reduced]);
  var slideStyle = useAnimatedStyle(function () {
    return {
      transform: [{ translateY: slide.value * (TAB_BAR_VISUAL_HEIGHT + 50) }],
      opacity: interpolate(slide.value, [0, 0.65, 1], [1, 0.35, 0]),
    };
  });

  // Which TABS index is focused (routes include hidden ones, so map by name)
  var focusedRoute = state.routes[state.index];
  var activeIdx = TABS.findIndex(function (tb) { return tb.name === (focusedRoute && focusedRoute.name); });
  var onHiddenRoute = activeIdx < 0;
  var safeIdx = onHiddenRoute ? CENTER_IDX : activeIdx;

  var [dockW, setDockW] = useState(SW - DOCK_MARGIN_X * 2);
  var slotW = dockW / TABS.length;

  // The gliding halo — one shared value, sprung to the active slot.
  var glide = useSharedValue(safeIdx);
  useEffect(function () {
    glide.value = reduced ? safeIdx : withSpring(safeIdx, { damping: 15, stiffness: 170, mass: 0.7 });
  }, [safeIdx, reduced]);
  var haloStyle = useAnimatedStyle(function () {
    return {
      opacity: onHiddenRoute ? 0 : 1,
      transform: [{ translateX: glide.value * slotW + slotW / 2 - 30 }],
    };
  });

  // Active page accent — the halo's tick crossfades between tab colors as it
  // glides (interpolateColor over the same spring that moves it).
  var activeAccent = (TABS[safeIdx] && TABS[safeIdx].color) || '#F4E4BC';
  var tickColorStyle = useAnimatedStyle(function () {
    return { backgroundColor: interpolateColor(glide.value, [0, 1, 2, 3, 4], TAB_ACCENTS) };
  });

  return (
    <Animated.View
      style={[dock.outerWrap, { paddingBottom: bottomPad }, slideStyle]}
      pointerEvents={hiddenNow ? 'none' : 'box-none'}
    >
      <View
        style={dock.pill}
        onLayout={function (e) { setDockW(e.nativeEvent.layout.width); }}
      >
        {/* glass */}
        <View style={[StyleSheet.absoluteFill, { borderRadius: DOCK_RADIUS, overflow: 'hidden' }]}>
          {Platform.OS !== 'web' ? <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} /> : null}
          <LinearGradient
            colors={['rgba(26,18,38,0.86)', 'rgba(12,8,20,0.96)', 'rgba(6,4,11,0.99)']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
          />
          {/* star dust in the glass */}
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
            {DOCK_STARS.map(function (st, i) {
              return <Circle key={'d' + i} cx={st[0] + '%'} cy={st[1]} r={st[2]} fill="#F4E4BC" opacity={st[3]} />;
            })}
          </Svg>
          {/* inner top highlight — the glass catches light */}
          <LinearGradient
            colors={['rgba(244,228,188,0.10)', 'transparent']}
            style={dock.innerLight}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
          />
          {/* the gliding halo — tinted to the active page's accent */}
          <Animated.View style={[dock.halo, haloStyle]} pointerEvents="none">
            <LinearGradient
              colors={[activeAccent + '3D', activeAccent + '0F', activeAccent + '00']}
              style={dock.haloGlow}
              start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
            />
            <Animated.View style={[dock.haloTick, { ...boxShadow(activeAccent, { width: 0, height: 1 }, 0.9, 6) }, tickColorStyle]} />
          </Animated.View>
        </View>

        {/* gold hairline rim (outside the clipped glass so it stays crisp) */}
        <View style={dock.rim} pointerEvents="none" />

        {/* tabs */}
        <View style={dock.row}>
          {TABS.map(function (tabConfig, idx) {
            var route = state.routes.find(function (r) { return r.name === tabConfig.name; });
            if (!route) return null;
            var isFocused = state.index === state.routes.indexOf(route);
            var label = t(tabConfig.titleKey) || tabConfig.label;
            function onPress() {
              var event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
            }
            if (idx === CENTER_IDX) {
              return <CenterMedallion key={route.key} focused={isFocused} onPress={onPress} label={label} reduced={reduced} />;
            }
            return <DockNode key={route.key} tabConfig={tabConfig} focused={isFocused} onPress={onPress} label={label} />;
          })}
        </View>
      </View>
    </Animated.View>
  );
}

var dock = StyleSheet.create({
  outerWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' },
  pill: {
    marginHorizontal: DOCK_MARGIN_X,
    alignSelf: 'stretch',
    height: DOCK_H,
    borderRadius: DOCK_RADIUS,
    ...boxShadow('rgba(0,0,0,0.55)', { width: 0, height: 10 }, 1, 24),
    elevation: 18,
  },
  rim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: DOCK_RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(214,181,109,0.30)',
  },
  innerLight: { position: 'absolute', top: 0, left: 14, right: 14, height: 16, borderRadius: 10 },
  halo: { position: 'absolute', top: 0, width: 60, height: DOCK_H, alignItems: 'center' },
  haloGlow: { position: 'absolute', top: 0, width: 60, height: DOCK_H, borderRadius: 18 },
  haloTick: { position: 'absolute', top: 0, width: 26, height: 2.4, borderRadius: 2, backgroundColor: '#F4E4BC', ...boxShadow('rgba(255,217,131,0.8)', { width: 0, height: 1 }, 0.9, 6) },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: DOCK_H,
    paddingBottom: 7,
  },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  nodeIcon: { height: 26, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 10, lineHeight: 13, fontWeight: '600', marginTop: 4, letterSpacing: 0.3, textAlign: 'center', maxWidth: '98%' },
  labelOn: { fontWeight: '800', letterSpacing: 0.5 },
  // — the sun medallion —
  medWrap: { marginTop: -MEDALLION_LIFT, alignItems: 'center', justifyContent: 'center' },
  medallion: {
    width: MEDALLION, height: MEDALLION, borderRadius: MEDALLION / 2,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.2, borderColor: 'rgba(214,181,109,0.45)',
    ...boxShadow('rgba(214,181,109,0.35)', { width: 0, height: 5 }, 0.9, 16),
    elevation: 14,
  },
  medallionOn: { borderColor: 'rgba(255,217,131,0.85)' },
  medOrbit: {
    position: 'absolute',
    width: MEDALLION + 12, height: MEDALLION + 12, borderRadius: (MEDALLION + 12) / 2,
    borderWidth: 1, borderColor: 'rgba(214,181,109,0.22)',
  },
  medCorona: {
    position: 'absolute',
    width: MEDALLION + 6, height: MEDALLION + 6, borderRadius: (MEDALLION + 6) / 2,
    backgroundColor: 'rgba(255,217,131,0.35)',
  },
  medLabel: { marginTop: 5 },
});

function HeaderTitle({ title }) {
  return (
    <View style={hs.wrap}>
      <Image source={LOGO} style={hs.logoIcon} resizeMode="contain" />
      <Text style={[hs.title, { color: Colors.luxuryPearl }]}>{title}</Text>
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
      style={[hs.avatarBtn, { backgroundColor: 'rgba(8,6,13,0.84)', borderColor: 'rgba(214,181,109,0.74)' }]}
    >
      {user && user.photoURL ? (
        <Image source={{ uri: user.photoURL }} style={hs.avatarImg} />
      ) : (
        <Text style={[hs.avatarInitial, { color: colors.textPrimary }]}>{initial}</Text>
      )}
    </TouchableOpacity>
  );
}

function DesktopSidebarStandalone({ language, onToggleLanguage, onCollapseChange }) {
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
    <DesktopSidebar state={fakeState} navigation={fakeNavigation}
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

// ── Offline Banner — shown when device has no internet ──
function OfflineBanner() {
  var { isConnected } = useNetworkStatus();
  if (isConnected) return null;
  return (
    <View style={offBan.wrap}>
      <Ionicons name="cloud-offline-outline" size={14} color="#FFF" />
      <Text style={offBan.text}>No internet connection</Text>
    </View>
  );
}
var offBan = StyleSheet.create({
  wrap: {
    backgroundColor: '#DC2626', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12,
    zIndex: 10000,
  },
  text: { color: '#FFF', fontSize: 12, fontWeight: '700' },
});

export default function TabLayout() {
  var { t, language, toggleLanguage } = useLanguage();
  var { colors } = useTheme();
  var [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  var isDesktop = useIsDesktop();

  var TAB_BAR_HEIGHT = TAB_BAR_VISUAL_HEIGHT;

  if (isDesktop) {
    return (
      <View style={[ds.shell, { backgroundColor: colors.bg }]}>
        <DesktopSidebarStandalone language={language}
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
      <OfflineBanner />
      <Tabs
        tabBar={function (props) { return <OrbitalNavBar {...props} />; }}
        sceneContainerStyle={{ backgroundColor: colors.bg }}
        screenOptions={function ({ route }) {
          return {
            headerShown: true, headerTransparent: true, headerTitleAlign: 'center',
            tabBarStyle: { height: TAB_BAR_HEIGHT },
            tabBarHideOnKeyboard: true,
            animation: 'none',
            lazy: true,
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
        var opts = { href: null, title: t('tabProfile') };
        // nakath & baby draw their own in-page headers (back button + title);
        // the navigator's floating header would double up on top of them and
        // show the wrong title ("අද") since they have no tab title of their own.
        if (name === 'nakath' || name === 'baby') opts.headerShown = false;
        return <Tabs.Screen key={name} name={name} options={opts} />;
      })}
    </Tabs>
    <TabCrossfade />
    </View>
  );
}

var hs = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon: { width: 22, height: 22, borderRadius: 6 },
  title: { fontSize: 15, fontWeight: '800', letterSpacing: 2.5, textTransform: 'uppercase', ...textShadow('rgba(214,181,109,0.26)', { width: 0, height: 1 }, 8) },
  avatarBtn: { width: 34, height: 34, borderRadius: 17, marginRight: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, overflow: 'hidden', ...boxShadow('rgba(214,181,109,0.26)', { width: 0, height: 2 }, 0.7, 10) },
  avatarImg: { width: '100%', height: '100%' },
  avatarInitial: { fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
});

function ThemedHeaderBackground() {
  if (Platform.OS === 'web') {
    return (
      <View style={[StyleSheet.absoluteFillObject, {
        backgroundColor: 'rgba(5,4,9,0.96)',
        borderBottomWidth: 1,
        borderBottomColor: Colors.luxuryHairline,
        overflow: 'hidden',
      }]}>
        <LinearGradient
          colors={['rgba(23,16,33,0.92)', 'rgba(5,4,9,0.98)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />
        <LinearGradient
          colors={['transparent', 'rgba(214,181,109,0.10)', 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
        />
      </View>
    );
  }
  return (
    <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['rgba(23,16,33,0.96)', 'rgba(10,6,16,0.82)', 'rgba(5,4,9,0.66)']}
        locations={[0, 0.52, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />
      <LinearGradient
        colors={['transparent', 'rgba(214,181,109,0.12)', 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
      />
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 0.8, backgroundColor: Colors.luxuryHairline }} />
    </BlurView>
  );
}

var ds = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', backgroundColor: Colors.deepVoid, overflow: 'hidden' },
  contentCol: { flex: 1, flexDirection: 'column', backgroundColor: Colors.deepVoid, overflow: 'hidden' },
  sceneContainer: { flex: 1, backgroundColor: Colors.deepVoid, overflow: 'hidden' },
});
