import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  View, StyleSheet, Platform, Text, Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withSequence, interpolate,
} from 'react-native-reanimated';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Colors } from '../../constants/theme';

var { width: SW } = Dimensions.get('window');

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
  var prev   = useRef(false);

  useEffect(function () {
    if (focused && !prev.current) {
      scale.value = withSequence(
        withSpring(1.18, { damping: 7, stiffness: 400 }),
        withSpring(1,    { damping: 14 })
      );
      iconY.value = withSequence(
        withSpring(-4, { damping: 8, stiffness: 420 }),
        withSpring(0,  { damping: 14 })
      );
      pill.value = withSpring(1, { damping: 15, stiffness: 180 });
    } else if (!focused && prev.current) {
      scale.value = withSpring(1,  { damping: 14 });
      iconY.value = withSpring(0,  { damping: 14 });
      pill.value  = withSpring(0,  { damping: 18, stiffness: 160 });
    }
    prev.current = focused;
  }, [focused]);

  var iconAnim = useAnimatedStyle(function () {
    return { transform: [{ scale: scale.value }, { translateY: iconY.value }] };
  });

  var pillAnim = useAnimatedStyle(function () {
    return {
      opacity:   interpolate(pill.value, [0, 1], [0, 1]),
      transform: [{ scaleX: interpolate(pill.value, [0, 1], [0.35, 1]) }],
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

      <Animated.View style={iconAnim}>
        <Ionicons
          name={focused ? tabConfig.iconFocused : tabConfig.icon}
          size={22}
          color={iconColor}
        />
      </Animated.View>

      <Text
        numberOfLines={1}
        style={[tb.label, focused && { color: tabConfig.gradient[0], opacity: 1 }]}
      >
        {label}
      </Text>
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
});

// ===========================================================================
//  HEADER COMPONENTS
// ===========================================================================

function HeaderTitle({ title }) {
  return (
    <View style={hs.wrap}>
      <Text style={hs.star}>{'\u2736'}</Text>
      <Text style={hs.title}>{title}</Text>
      <Text style={hs.star}>{'\u2736'}</Text>
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
//  TAB LAYOUT
// ===========================================================================

export default function TabLayout() {
  var { t, language } = useLanguage();
  var { user } = useAuth();
  var [tokenBalance, setTokenBalance] = useState(null);

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
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  title: {
    fontSize: 16, fontWeight: '800', color: '#FBBF24',
    letterSpacing: 2.5, textTransform: 'uppercase',
    textShadowColor: 'rgba(251,191,36,0.6)',
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10,
  },
  star: {
    fontSize: 10, color: '#C084FC',
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