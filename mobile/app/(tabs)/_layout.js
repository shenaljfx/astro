import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  View, StyleSheet, Platform, Text, Dimensions,
  TouchableOpacity, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withSequence, interpolate, Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Colors } from '../../constants/theme';
import DesktopSidebar, { SIDEBAR_W_EXPANDED, SIDEBAR_W_COLLAPSED, DesktopTopBar } from '../../components/DesktopLayout';
import useIsDesktop from '../../hooks/useIsDesktop';

var { width: SW } = Dimensions.get('window');
var LOGO = require('../../assets/logo.png');

// ===========================================================================
//  TAB CONFIGURATION  -  all 6 shown in the bar, evenly spread
// ===========================================================================

var TABS = [
  { name: 'index',    title: 'Today',  titleSi: 'අද',        icon: 'sunny-outline',         iconFocused: 'sunny',          gradient: ['#FBBF24', '#F59E0B'] },
  { name: 'kendara',  title: 'Chart',  titleSi: 'කේන්දරේ',  icon: 'planet-outline',        iconFocused: 'planet',         gradient: ['#C084FC', '#9333EA'] },
  { name: 'report',   title: 'Report', titleSi: 'වාර්තාව',  icon: 'document-text-outline', iconFocused: 'document-text',  gradient: ['#34D399', '#059669'] },
  { name: 'chat',     title: 'Guide',  titleSi: 'මාර්ගය',   icon: 'sparkles-outline',      iconFocused: 'sparkles',       gradient: ['#FBBF24', '#9333EA'] },
  { name: 'porondam', title: 'Match',  titleSi: 'පොරොන්දම', icon: 'heart-circle-outline',  iconFocused: 'heart-circle',   gradient: ['#F472B6', '#DB2777'] },
  { name: 'profile',  title: 'Aura',   titleSi: 'මම',        icon: 'person-circle-outline', iconFocused: 'person-circle',  gradient: ['#4CC9F0', '#3B82F6'] },
];

// Bar dimensions
var BAR_H      = 62;   // tab bar height
var BAR_RADIUS = 24;   // floating pill corner radius
var BAR_MX     = 10;   // horizontal gap from screen edge
var BAR_MB     = 8;    // gap above home-indicator / screen bottom

// ===========================================================================
//  TAB BUTTON  -  icon + label, animated pill bg on active
// ===========================================================================

function TabButton({ tabConfig, focused, onPress, routeKey, label }) {
  var scale  = useSharedValue(1);
  var pill   = useSharedValue(0);
  var iconY  = useSharedValue(0);
  var glowPulse = useSharedValue(0);
  var labelOpacity = useSharedValue(focused ? 1 : 0.28);
  var labelTransY  = useSharedValue(focused ? 0 : 4);
  var prev   = useRef(false);

  useEffect(function () {
    if (focused && !prev.current) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      scale.value = withSequence(
        withSpring(1.22, { damping: 6, stiffness: 420 }),
        withSpring(1,    { damping: 12 })
      );
      iconY.value = withSequence(
        withSpring(-5, { damping: 7, stiffness: 440 }),
        withSpring(0,  { damping: 12 })
      );
      pill.value = withSpring(1, { damping: 14, stiffness: 180 });
      labelOpacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.quad) });
      labelTransY.value  = withSpring(0, { damping: 14, stiffness: 200 });
      glowPulse.value = withTiming(1, { duration: 350 });
    } else if (!focused && prev.current) {
      scale.value = withSpring(1,  { damping: 14 });
      iconY.value = withSpring(0,  { damping: 14 });
      pill.value  = withSpring(0,  { damping: 18, stiffness: 160 });
      labelOpacity.value = withTiming(0.28, { duration: 200 });
      labelTransY.value  = withTiming(4, { duration: 200 });
      glowPulse.value = withTiming(0, { duration: 200 });
    }
    prev.current = focused;
  }, [focused]);

  var iconAnim = useAnimatedStyle(function () {
    return {
      transform: [{ scale: scale.value }, { translateY: iconY.value }],
      shadowOpacity: interpolate(glowPulse.value, [0, 1], [0, 0.9]),
      shadowRadius: interpolate(glowPulse.value, [0, 1], [0, 14]),
    };
  });

  var pillAnim = useAnimatedStyle(function () {
    return {
      opacity:   interpolate(pill.value, [0, 1], [0, 1]),
      transform: [{ scaleX: interpolate(pill.value, [0, 1], [0.3, 1]) }, { scaleY: interpolate(pill.value, [0, 1], [0.6, 1]) }],
    };
  });

  var labelAnim = useAnimatedStyle(function () {
    return {
      opacity: labelOpacity.value,
      transform: [{ translateY: labelTransY.value }],
    };
  });

  var iconColor = focused ? tabConfig.gradient[0] : 'rgba(255,255,255,0.36)';

  return (
    <TouchableOpacity
      key={routeKey}
      activeOpacity={0.72}
      onPress={onPress}
      style={tb.tabBtn}
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={label}
    >
      <Animated.View style={[tb.activePill, pillAnim]}>
        <LinearGradient
          colors={[tabConfig.gradient[0] + '30', tabConfig.gradient[1] + '16']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />
        <View style={[tb.activePillBorder, { borderColor: tabConfig.gradient[0] + '50' }]} />
      </Animated.View>

      <Animated.View style={[iconAnim, { shadowColor: tabConfig.gradient[0], shadowOffset: { width: 0, height: 0 } }]}>
        <Ionicons
          name={focused ? tabConfig.iconFocused : tabConfig.icon}
          size={22}
          color={iconColor}
        />
      </Animated.View>

      <Animated.Text
        numberOfLines={1}
        style={[tb.label, focused && { color: tabConfig.gradient[0] }, labelAnim]}
      >
        {label}
      </Animated.Text>
    </TouchableOpacity>
  );
}

// ===========================================================================
//  CUSTOM TAB BAR  -  floating pill, 6 tabs evenly spread
// ===========================================================================

function CosmicTabBar({ state, descriptors, navigation }) {
  var { language } = useLanguage();
  var insets = useSafeAreaInsets();
  var bottomPad = Math.max(insets.bottom, 4);

  var tabCount = TABS.length;
  var barInnerWidth = SW - BAR_MX * 2 - 4;
  var tabW = barInnerWidth / tabCount;

  var indicatorX = useSharedValue(state.index * tabW);

  useEffect(function () {
    indicatorX.value = withSpring(state.index * tabW, {
      damping: 18,
      stiffness: 180,
      mass: 0.8,
    });
  }, [state.index, tabW]);

  var currentTab = TABS[state.index] || TABS[0];

  var indicatorStyle = useAnimatedStyle(function () {
    return {
      transform: [{ translateX: indicatorX.value }],
    };
  });

  return (
    <View style={[tb.outerWrap, { paddingBottom: bottomPad }]}>
      <View style={tb.pill}>

        {Platform.OS !== 'web' ? (
          <View style={[StyleSheet.absoluteFill, { borderRadius: BAR_RADIUS, overflow: 'hidden' }]}>
            <BlurView intensity={75} tint="dark" style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={['rgba(12,6,32,0.95)', 'rgba(5,3,16,0.98)']}
              style={StyleSheet.absoluteFill}
            />
          </View>
        ) : (
          <View style={[StyleSheet.absoluteFill, { borderRadius: BAR_RADIUS, backgroundColor: 'rgba(8,4,20,0.98)' }]} />
        )}

        <LinearGradient
          colors={['rgba(251,191,36,0.6)', 'rgba(147,51,234,0.7)', 'rgba(76,201,240,0.5)']}
          style={tb.topEdge}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
        />

        {/* Sliding glow indicator */}
        <Animated.View style={[tb.slideIndicator, { width: tabW }, indicatorStyle]}>
          <View style={tb.slideIndicatorDot}>
            <LinearGradient
              colors={currentTab.gradient}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            />
          </View>
        </Animated.View>

        <View style={tb.row}>
          {TABS.map(function (tabConfig) {
            var route = state.routes.find(function (r) { return r.name === tabConfig.name; });
            if (!route) return null;
            var isFocused = state.index === state.routes.indexOf(route);
            var label = language === 'si' ? tabConfig.titleSi : tabConfig.title;
            function onPress() {
              var event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
            }
            return (
              <TabButton
                key={route.key}
                routeKey={route.key}
                tabConfig={tabConfig}
                focused={isFocused}
                onPress={onPress}
                label={label}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ===========================================================================
//  STYLES
// ===========================================================================

var tb = StyleSheet.create({
  outerWrap: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
  },
  pill: {
    marginHorizontal: BAR_MX,
    marginBottom: BAR_MB,
    height: BAR_H,
    borderRadius: BAR_RADIUS,
    overflow: 'visible',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.40,
    shadowRadius: 18,
    elevation: 22,
  },
  topEdge: {
    position: 'absolute',
    top: 0,
    left: BAR_RADIUS,
    right: BAR_RADIUS,
    height: 1.5,
    borderRadius: 1,
    opacity: 0.9,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: BAR_H,
    paddingVertical: 7,
    minWidth: 0,
  },
  activePill: {
    position: 'absolute',
    top: 8, bottom: 8,
    left: 3, right: 3,
    borderRadius: 14,
    overflow: 'hidden',
  },
  activePillBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderWidth: 1,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.28)',
    letterSpacing: 0.35,
    marginTop: 3,
    textTransform: 'uppercase',
  },
  slideIndicator: {
    position: 'absolute',
    top: 0,
    left: 2,
    height: BAR_H,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
    zIndex: 0,
  },
  slideIndicatorDot: {
    width: 20,
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
    opacity: 0.7,
  },
});

// ===========================================================================
//  HEADER COMPONENTS
// ===========================================================================

function HeaderTitle({ title }) {
  return (
    <View style={hs.wrap}>
      <Image source={LOGO} style={hs.logoIcon} resizeMode="contain" />
      <Text style={hs.title}>{title}</Text>
    </View>
  );
}

function BalancePill({ balance }) {
  if (balance === null) return null;
  var isLow = balance < 10;
  return (
    <View style={[hs.balancePill, isLow && { borderColor: 'rgba(248,113,113,0.35)', backgroundColor: 'rgba(248,113,113,0.1)' }]}>
      <Ionicons name="wallet-outline" size={11} color={isLow ? '#F87171' : '#FBBF24'} />
      <Text style={[hs.balanceText, isLow && { color: '#F87171' }]}>
        {'LKR ' + balance}
      </Text>
    </View>
  );
}

// ===========================================================================
//  DESKTOP SIDEBAR STANDALONE
//  Drives navigation via useRouter/usePathname — lives outside <Tabs>
// ===========================================================================

function DesktopSidebarStandalone({ balance, language, onToggleLanguage, onCollapseChange }) {
  var router   = useRouter();
  var pathname = usePathname();

  // Build a minimal state/navigation shim for DesktopSidebar
  var routeIndex = TABS.findIndex(function (t) {
    var seg = pathname === '/' ? 'index' : pathname.replace(/^\//, '').split('/')[0];
    return t.name === seg || (seg === '' && t.name === 'index');
  });
  var activeIndex = routeIndex < 0 ? 0 : routeIndex;

  var fakeState = {
    index: activeIndex,
    routes: TABS.map(function (t) { return { name: t.name, key: t.name }; }),
  };
  var fakeNavigation = {
    emit: function () { return { defaultPrevented: false }; },
    navigate: function (name) { router.push('/' + (name === 'index' ? '' : name)); },
  };

  return (
    <DesktopSidebar
      state={fakeState}
      navigation={fakeNavigation}
      balance={balance}
      language={language}
      onToggleLanguage={onToggleLanguage}
      onCollapseChange={onCollapseChange}
    />
  );
}

// ===========================================================================
//  TAB LAYOUT
// ===========================================================================

export default function TabLayout() {
  var { t, language, toggleLanguage } = useLanguage();
  var { user } = useAuth();
  var [tokenBalance, setTokenBalance] = useState(null);
  var [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  var isDesktop = useIsDesktop();

  var refreshBalance = useCallback(function () {
    api.getTokenBalance()
      .then(function (res) {
        if (res && res.balance !== undefined) setTokenBalance(res.balance);
      })
      .catch(function () {});
  }, []);

  useEffect(function () {
    refreshBalance();
  }, [user, refreshBalance]);

  var TAB_BAR_HEIGHT = BAR_H + BAR_MB + 16;

  // ── Desktop: true flex-row shell ────────────────────────────────────
  // DesktopSidebar is rendered as a real flex sibling OUTSIDE Tabs so it
  // occupies its own column.  The Tabs sceneContainer gets paddingLeft equal
  // to the live sidebar width so content never slides under the panel.
  if (isDesktop) {
    return (
      <View style={ds.shell}>
        {/* Sidebar lives here, outside Tabs, as a true left column */}
        <DesktopSidebarStandalone
          balance={tokenBalance}
          language={language}
          onToggleLanguage={toggleLanguage}
          onCollapseChange={setSidebarCollapsed}
        />
        {/* Content column — offset by sidebar width */}
        <View style={ds.contentCol}>
          <Tabs
            tabBar={function () { return null; }}
            sceneContainerStyle={ds.sceneContainer}
            screenOptions={{ headerShown: false }}
          >
            {TABS.map(function (tab) {
              return (
                <Tabs.Screen
                  key={tab.name}
                  name={tab.name}
                  options={{ title: language === 'si' ? tab.titleSi : tab.title }}
                />
              );
            })}
          </Tabs>
        </View>
      </View>
    );
  }

  // ── Mobile / tablet: original tab bar ──────────────────────────────
  return (
    <Tabs
      tabBar={function (props) { return <CosmicTabBar {...props} />; }}
      sceneContainerStyle={{ backgroundColor: '#030014' }}
      screenOptions={function ({ route }) {
        return {
          headerShown: true,
          headerTransparent: true,
          headerTitleAlign: 'center',
          tabBarStyle: { height: TAB_BAR_HEIGHT },
          animation: 'fade',
          animationDuration: 200,
          headerTitle: function () {
            var tabKey = 'tabHome';
            if (route.name === 'porondam') tabKey = 'tabPorondam';
            if (route.name === 'kendara')  tabKey = 'tabKendara';
            if (route.name === 'report')   tabKey = 'tabReport';
            if (route.name === 'chat')     tabKey = 'tabChat';
            if (route.name === 'profile')  tabKey = 'tabProfile';
            return <HeaderTitle title={t(tabKey)} />;
          },
          headerBackground: function () {
            if (Platform.OS === 'web') return <View style={hs.webBg} />;
            return (
              <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFill}>
                <LinearGradient
                  colors={['rgba(9,5,28,0.92)', 'rgba(4,3,12,0.50)']}
                  style={StyleSheet.absoluteFill}
                />
                <View style={hs.borderLine} />
              </BlurView>
            );
          },
          headerRight: function () {
            return <BalancePill balance={tokenBalance} />;
          },
        };
      }}
    >
      {TABS.map(function (tab) {
        var extraOpts = {};
        if (tab.name === 'chat') extraOpts.headerShown = false;
        return (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={Object.assign({ title: language === 'si' ? tab.titleSi : tab.title }, extraOpts)}
          />
        );
      })}
    </Tabs>
  );
}

// ===========================================================================
//  HEADER STYLES
// ===========================================================================

var hs = StyleSheet.create({
  webBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9,5,28,0.96)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(251,191,36,0.12)',
  },
  borderLine: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: 'rgba(251,191,36,0.18)',
  },
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  logoIcon: {
    width: 22, height: 22, borderRadius: 6,
  },
  title: {
    fontSize: 16, fontWeight: '800', color: '#FBBF24',
    letterSpacing: 2.5, textTransform: 'uppercase',
    textShadowColor: 'rgba(251,191,36,0.6)',
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10,
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.28)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginRight: 14,
  },
  balanceText: {
    fontSize: 11, fontWeight: '700',
    color: '#FBBF24', letterSpacing: 0.3,
  },
});

// ===========================================================================
//  DESKTOP SHELL STYLES
// ===========================================================================

var ds = StyleSheet.create({
  // Outer row: sidebar on the left, content column on the right
  shell: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#04030C',
    overflow: 'hidden',
  },
  // The right-hand column that fills space next to the sidebar
  contentCol: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#04030C',
    overflow: 'hidden',
  },
  // The Expo Router sceneContainer — fills all space inside contentCol
  sceneContainer: {
    flex: 1,
    backgroundColor: '#04030C',
    overflow: 'hidden',
  },
});