import React, { useEffect, useRef, useState, useCallback } from 'react';
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
import CosmicAuroraNebula from '../../components/effects/CosmicAuroraNebula';

var { width: SW } = Dimensions.get('window');
var LOGO = require('../../assets/logo.png');

var TABS = [
  { name: 'index',    title: 'Today',  titleSi: 'අද',        icon: 'sunny-outline',         iconFocused: 'sunny',          gradient: ['#FFB800', '#F59E0B'] },
  { name: 'kendara',  title: 'Chart',  titleSi: 'කේන්දරේ',  icon: 'planet-outline',        iconFocused: 'planet',         gradient: ['#FF8C00', '#E65100'] },
  { name: 'report',   title: 'Report', titleSi: 'වාර්තාව',  icon: 'document-text-outline', iconFocused: 'document-text',  gradient: ['#34D399', '#059669'] },
  { name: 'chat',     title: 'Guide',  titleSi: 'මාර්ගය',   icon: 'sparkles-outline',      iconFocused: 'sparkles',       gradient: ['#FFB800', '#FF8C00'] },
  { name: 'porondam', title: 'Match',  titleSi: 'පොරොන්දම', icon: 'heart-circle-outline',  iconFocused: 'heart-circle',   gradient: ['#F472B6', '#DB2777'] },
  { name: 'profile',  title: 'Aura',   titleSi: 'මම',        icon: 'person-circle-outline', iconFocused: 'person-circle',  gradient: ['#4CC9F0', '#3B82F6'] },
];

var BAR_H = 64;
var BAR_MX = 12;
var BAR_MB = 8;
var BAR_RADIUS = 22;

/* ── Tab Button ── */
function TabButton({ tabConfig, focused, onPress, routeKey, label }) {
  var scale = useSharedValue(1);
  var dotScale = useSharedValue(0);
  var labelOpacity = useSharedValue(focused ? 1 : 0.55);
  var prev = useRef(false);

  useEffect(function () {
    if (focused && !prev.current) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      scale.value = withSequence(
        withSpring(1.15, { damping: 8, stiffness: 380 }),
        withSpring(1, { damping: 12, stiffness: 200 })
      );
      dotScale.value = withSpring(1, { damping: 14, stiffness: 200 });
      labelOpacity.value = withTiming(1, { duration: 200 });
    } else if (!focused && prev.current) {
      scale.value = withSpring(1, { damping: 14 });
      dotScale.value = withSpring(0, { damping: 18, stiffness: 160 });
      labelOpacity.value = withTiming(0.55, { duration: 200 });
    }
    prev.current = focused;
  }, [focused]);

  var iconAnim = useAnimatedStyle(function () {
    return { transform: [{ scale: scale.value }] };
  });

  var dotAnim = useAnimatedStyle(function () {
    return {
      opacity: interpolate(dotScale.value, [0, 1], [0, 0.85]),
      transform: [{ scaleX: dotScale.value }],
    };
  });

  var labelAnim = useAnimatedStyle(function () {
    return { opacity: labelOpacity.value };
  });

  var iconColor = focused ? tabConfig.gradient[0] : 'rgba(255,255,255,0.40)';

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
      <Animated.View style={iconAnim}>
        <Ionicons
          name={focused ? tabConfig.iconFocused : tabConfig.icon}
          size={21}
          color={iconColor}
        />
      </Animated.View>

      <Animated.Text
        numberOfLines={1}
        style={[tb.label, focused && { color: tabConfig.gradient[0] }, labelAnim]}
      >
        {label}
      </Animated.Text>

      {/* Gradient dot under active tab */}
      <Animated.View style={[tb.dot, dotAnim]}>
        <LinearGradient
          colors={tabConfig.gradient}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

/* ── Tab Bar ── */
function CosmicTabBar({ state, descriptors, navigation }) {
  var { language } = useLanguage();
  var insets = useSafeAreaInsets();
  var bottomPad = Math.max(insets.bottom, 4);

  return (
    <View style={[tb.outerWrap, { paddingBottom: bottomPad }]}>
      <View style={tb.pill}>
        {Platform.OS !== 'web' ? (
          <View style={[StyleSheet.absoluteFill, { borderRadius: BAR_RADIUS, overflow: 'hidden' }]}>
            <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8,4,24,0.92)' }]} />
          </View>
        ) : (
          <View style={[StyleSheet.absoluteFill, { borderRadius: BAR_RADIUS, backgroundColor: 'rgba(8,4,24,0.96)' }]} />
        )}

        {/* Subtle top glow line */}
        <LinearGradient
          colors={['rgba(255,140,0,0.35)', 'rgba(255,184,0,0.30)', 'rgba(76,201,240,0.30)']}
          style={tb.topEdge}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
        />

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
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.04)',
    shadowColor: 'rgba(0,0,0,0.6)',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 16,
  },
  topEdge: {
    position: 'absolute',
    top: 0,
    left: BAR_RADIUS,
    right: BAR_RADIUS,
    height: 1,
    borderRadius: 0.5,
    opacity: 0.8,
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
    paddingTop: 5,
    paddingBottom: 4,
    minWidth: 0,
    overflow: 'visible',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.4,
    marginTop: 4,
    lineHeight: 14,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  dot: {
    width: 16,
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
    marginTop: 2,
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
  if (balance === null) return null;
  var isLow = balance < 10;
  return (
    <View style={[hs.balancePill, isLow && { borderColor: 'rgba(248,113,113,0.35)', backgroundColor: 'rgba(248,113,113,0.1)' }]}>
      <Ionicons name="wallet-outline" size={11} color={isLow ? '#F87171' : '#FFB800'} />
      <Text style={[hs.balanceText, isLow && { color: '#F87171' }]}>
        {'LKR ' + balance}
      </Text>
    </View>
  );
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
        <CosmicAuroraNebula />
        <DesktopSidebarStandalone
          balance={tokenBalance}
          language={language}
          onToggleLanguage={toggleLanguage}
          onCollapseChange={setSidebarCollapsed}
        />
        <View style={ds.contentCol}>
          <Tabs
            tabBar={function () { return null; }}
            sceneContainerStyle={{ backgroundColor: 'transparent' }}
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
    <View style={{ flex: 1, backgroundColor: Colors.deepVoid }}>
      <CosmicAuroraNebula />
    <Tabs
      tabBar={function (props) { return <CosmicTabBar {...props} />; }}
      sceneContainerStyle={{ backgroundColor: 'transparent' }}
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
              <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill}>
                <LinearGradient
                  colors={['rgba(2,0,16,0.92)', 'rgba(12,6,40,0.50)']}
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
    </View>
  );
}

var hs = StyleSheet.create({
  webBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2,0,16,0.96)',
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
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
});
