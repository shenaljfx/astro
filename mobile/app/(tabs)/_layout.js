import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  View, StyleSheet, Platform, Text, Dimensions,
  TouchableOpacity, Image, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withSequence, interpolate, Easing, useDerivedValue,
  useAnimatedProps, SharedTransition, runOnJS,
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

var TABS = [
  { name: 'index',    title: 'Today',  titleSi: 'අද',        icon: 'sunny-outline',         iconFocused: 'sunny',          gradient: ['#FFB800', '#F59E0B'],  glowColor: 'rgba(255,184,0,0.18)' },
  { name: 'kendara',  title: 'Chart',  titleSi: 'කේන්දරේ',  icon: 'planet-outline',        iconFocused: 'planet',         gradient: ['#FF8C00', '#E65100'],  glowColor: 'rgba(255,140,0,0.18)' },
  { name: 'report',   title: 'Report', titleSi: 'වාර්තාව',  icon: 'document-text-outline', iconFocused: 'document-text',  gradient: ['#34D399', '#059669'],  glowColor: 'rgba(52,211,153,0.16)' },
  { name: 'chat',     title: 'Guide',  titleSi: 'මාර්ගය',   icon: 'sparkles-outline',      iconFocused: 'sparkles',       gradient: ['#FFB800', '#FF8C00'],  glowColor: 'rgba(255,184,0,0.18)' },
  { name: 'porondam', title: 'Match',  titleSi: 'පොරොන්දම', icon: 'heart-circle-outline',  iconFocused: 'heart-circle',   gradient: ['#F472B6', '#DB2777'],  glowColor: 'rgba(244,114,182,0.16)' },
  { name: 'profile',  title: 'Aura',   titleSi: 'මම',        icon: 'person-circle-outline', iconFocused: 'person-circle',  gradient: ['#A78BFA', '#7C3AED'],  glowColor: 'rgba(167,139,250,0.16)' },
];

var BAR_H = 72;
var BAR_MX = 14;
var BAR_MB = 10;
var BAR_RADIUS = 28;
var ICON_SIZE = 23;
var ICON_SIZE_ACTIVE = 25;

/* ── Tab Button ── */
function TabButton({ tabConfig, focused, onPress, routeKey, label, tabIndex }) {
  var scale = useSharedValue(1);
  var glowOpacity = useSharedValue(focused ? 1 : 0);
  var iconY = useSharedValue(focused ? -2 : 0);
  var labelOpacity = useSharedValue(focused ? 1 : 0.45);
  var labelScale = useSharedValue(focused ? 1 : 0.92);
  var prev = useRef(false);

  useEffect(function () {
    if (focused && !prev.current) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      scale.value = withSequence(
        withSpring(1.18, { damping: 9, stiffness: 400 }),
        withSpring(1, { damping: 14, stiffness: 220 })
      );
      glowOpacity.value = withSpring(1, { damping: 18, stiffness: 180 });
      iconY.value = withSpring(-2, { damping: 14, stiffness: 200 });
      labelOpacity.value = withTiming(1, { duration: 250 });
      labelScale.value = withSpring(1, { damping: 14, stiffness: 200 });
    } else if (!focused && prev.current) {
      scale.value = withSpring(1, { damping: 16 });
      glowOpacity.value = withTiming(0, { duration: 280 });
      iconY.value = withSpring(0, { damping: 14 });
      labelOpacity.value = withTiming(0.45, { duration: 220 });
      labelScale.value = withSpring(0.92, { damping: 14 });
    }
    prev.current = focused;
  }, [focused]);

  var iconAnim = useAnimatedStyle(function () {
    return { transform: [{ scale: scale.value }, { translateY: iconY.value }] };
  });

  var glowAnim = useAnimatedStyle(function () {
    return { opacity: glowOpacity.value };
  });

  var labelAnim = useAnimatedStyle(function () {
    return {
      opacity: labelOpacity.value,
      transform: [{ scale: labelScale.value }],
    };
  });

  var iconColor = focused ? tabConfig.gradient[0] : 'rgba(255,255,255,0.35)';

  return (
    <TouchableOpacity
      key={routeKey}
      activeOpacity={0.65}
      onPress={onPress}
      style={tb.tabBtn}
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={label}
    >
      {/* Active glow backdrop */}
      <Animated.View style={[tb.glowBg, glowAnim]}>
        <LinearGradient
          colors={[tabConfig.glowColor, 'transparent']}
          style={tb.glowGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>

      <Animated.View style={iconAnim}>
        <Ionicons
          name={focused ? tabConfig.iconFocused : tabConfig.icon}
          size={focused ? ICON_SIZE_ACTIVE : ICON_SIZE}
          color={iconColor}
        />
      </Animated.View>

      <Animated.Text
        numberOfLines={1}
        style={[
          tb.label,
          focused && { color: tabConfig.gradient[0] },
          labelAnim,
        ]}
      >
        {label}
      </Animated.Text>

      {/* Active indicator line */}
      {focused && (
        <Animated.View style={[tb.activeLine]}>
          <LinearGradient
            colors={tabConfig.gradient}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
          />
        </Animated.View>
      )}
    </TouchableOpacity>
  );
}

/* ── Tab Bar ── */
function CosmicTabBar({ state, descriptors, navigation }) {
  var { language } = useLanguage();
  var insets = useSafeAreaInsets();
  var bottomPad = Math.max(insets.bottom, 6);

  return (
    <View style={[tb.outerWrap, { paddingBottom: bottomPad }]}>
      {/* Shadow layer underneath */}
      <View style={tb.shadowLayer} />

      <View style={tb.pill}>
        {/* Glass background */}
        {Platform.OS !== 'web' ? (
          <View style={[StyleSheet.absoluteFill, { borderRadius: BAR_RADIUS, overflow: 'hidden' }]}>
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8,5,14,0.88)' }]} />
          </View>
        ) : (
          <View style={[StyleSheet.absoluteFill, { borderRadius: BAR_RADIUS, backgroundColor: 'rgba(8,5,14,0.95)' }]} />
        )}

        {/* Top edge glow */}
        <LinearGradient
          colors={['rgba(255,184,0,0.00)', 'rgba(255,184,0,0.28)', 'rgba(255,160,40,0.28)', 'rgba(255,184,0,0.00)']}
          locations={[0, 0.3, 0.7, 1]}
          style={tb.topEdge}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
        />

        {/* Inner border shimmer */}
        <View style={tb.innerBorder} />

        <View style={tb.row}>
          {TABS.map(function (tabConfig, idx) {
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
                tabIndex={idx}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

var tb = StyleSheet.create({
  outerWrap: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
  },
  shadowLayer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: BAR_H + BAR_MB + 40,
    backgroundColor: 'transparent',
  },
  pill: {
    marginHorizontal: BAR_MX,
    marginBottom: BAR_MB,
    height: BAR_H,
    borderRadius: BAR_RADIUS,
    overflow: 'visible',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  topEdge: {
    position: 'absolute',
    top: -0.5,
    left: BAR_RADIUS * 0.8,
    right: BAR_RADIUS * 0.8,
    height: 1,
    borderRadius: 0.5,
  },
  innerBorder: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: BAR_RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: BAR_H,
    paddingTop: 6,
    paddingBottom: 6,
    minWidth: 0,
    overflow: 'visible',
    position: 'relative',
  },
  glowBg: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: 18,
    overflow: 'hidden',
  },
  glowGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.40)',
    letterSpacing: 0.3,
    marginTop: 4,
    lineHeight: 14,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  activeLine: {
    width: 20,
    height: 2.5,
    borderRadius: 1.25,
    overflow: 'hidden',
    marginTop: 3,
  },
});

/* ── Header Components ── */
function HeaderTitle({ title }) {
  return (
    <View style={hs.wrap}>
      <Image source={LOGO} style={hs.logoIcon} resizeMode="contain" />
      <Text style={hs.title}>{title}</Text>
    </View>
  );
}

function BalancePill({ balance }) {
  return null;
}

/* ── Desktop Sidebar ── */
function DesktopSidebarStandalone({ balance, language, onToggleLanguage, onCollapseChange }) {
  var router = useRouter();
  var pathname = usePathname();

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

/* ── Tab Layout ── */
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

  if (isDesktop) {
    return (
      <View style={ds.shell}>
        <DesktopSidebarStandalone
          balance={tokenBalance}
          language={language}
          onToggleLanguage={toggleLanguage}
          onCollapseChange={setSidebarCollapsed}
        />
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

  return (
    <Tabs
      tabBar={function (props) { return <CosmicTabBar {...props} />; }}
      sceneContainerStyle={{ backgroundColor: Colors.deepVoid }}
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
              <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill}>
                <LinearGradient
                  colors={['rgba(8,5,14,0.94)', 'rgba(10,7,16,0.60)']}
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

var hs = StyleSheet.create({
  webBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,5,14,0.96)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,140,0,0.10)',
  },
  borderLine: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: 'rgba(255,140,0,0.12)',
  },
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  logoIcon: {
    width: 22, height: 22, borderRadius: 6,
  },
  title: {
    fontSize: 16, fontWeight: '800', color: '#FFB800',
    letterSpacing: 2.5, textTransform: 'uppercase',
    textShadowColor: 'rgba(255,184,0,0.5)',
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8,
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,184,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginRight: 14,
  },
  balanceText: {
    fontSize: 11, fontWeight: '700',
    color: '#FFB800', letterSpacing: 0.3,
  },
});

var ds = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.deepVoid,
    overflow: 'hidden',
  },
  contentCol: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: Colors.deepVoid,
    overflow: 'hidden',
  },
  sceneContainer: {
    flex: 1,
    backgroundColor: Colors.deepVoid,
    overflow: 'hidden',
  },
});
