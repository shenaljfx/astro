import { Stack, router } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, Image, StyleSheet, Platform, Dimensions, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withSequence, withDelay,
  interpolate, Easing, cancelAnimation, FadeIn, FadeInUp, FadeInDown,
} from 'react-native-reanimated';
import { LanguageProvider } from '../contexts/LanguageContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { PricingProvider } from '../contexts/PricingContext';
import OnboardingScreen from './onboarding';
import { useTheme } from '../contexts/ThemeContext';
import { boxShadow } from '../utils/shadow';
import {
  setupNotificationChannels,
  ensureDailyGuidanceSchedule,
  addNotificationResponseListener,
  getLastNotificationResponse,
  getNotificationNavigationTarget,
  clearBadge,
} from '../services/notifications';
import { APP_LOGO_IMAGE } from '../assets/logo-inline';

// Suppress known harmless warnings from third-party libs on web
// - "Unexpected text node" comes from react-native-gesture-handler's GestureDetector on web
// - "findDOMNode is deprecated" comes from react-native-reanimated on web
// - "Property [opacity] may be overwritten" is a Reanimated layout animation warning
LogBox.ignoreLogs([
  'Unexpected text node',
  'findDOMNode is deprecated',
  'Property [opacity] may be overwritten',
  '[Reanimated] Property',
]);

// On web LogBox doesn't run, so the same warnings leak to the browser
// console. Filter them out of console.error directly.
if (Platform.OS === 'web' && typeof console !== 'undefined' && !console.__grahacharaFiltered) {
  var _origErr = console.error;
  var IGNORE_PATTERNS = [
    'Unexpected text node',
    'findDOMNode is deprecated',
    'Property [opacity] may be overwritten',
    '[Reanimated] Property',
  ];
  console.error = function () {
    try {
      var first = arguments[0];
      var msg = typeof first === 'string' ? first : (first && first.message) || '';
      for (var i = 0; i < IGNORE_PATTERNS.length; i++) {
        if (msg && msg.indexOf(IGNORE_PATTERNS[i]) !== -1) return;
      }
    } catch (_) { /* fall through */ }
    return _origErr.apply(console, arguments);
  };
  console.__grahacharaFiltered = true;
}

// Fix white background on web — initial color only (theme paints over)
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  var style = document.createElement('style');
  style.textContent = 'html,body,#root{margin:0;padding:0;overflow:hidden;height:100%;width:100%;}';
  document.head.appendChild(style);
}

// ── Zodiac glyph orbiting around the logo ──
var ZODIAC_GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
var GLYPH_COLORS = [
  '#EF4444', '#22C55E', '#FBBF24', '#94A3B8', '#F97316', '#C084FC',
  '#EC4899', '#DC2626', '#818CF8', '#64748B', '#06B6D4', '#14B8A6',
];

function SplashZodiacGlyph({ glyph, color, index, total, radius, rotation }) {
  var baseAngle = (2 * Math.PI / total) * index;
  var aStyle = useAnimatedStyle(function() {
    var angle = baseAngle + rotation.value;
    var x = Math.cos(angle) * radius;
    var y = Math.sin(angle) * radius;
    var osc = interpolate(Math.sin(rotation.value * 2 + index), [-1, 1], [0.35, 0.85]);
    return {
      transform: [{ translateX: x }, { translateY: y }],
      opacity: osc,
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }, aStyle]}>
      <Text style={{ fontSize: 16, color: color }}>{glyph}</Text>
    </Animated.View>
  );
}

// ── Shimmer loading dots ──
function ShimmerDot({ index, delay }) {
  var opacity = useSharedValue(0.2);
  useEffect(function() {
    opacity.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(1, { duration: 500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.2, { duration: 500, easing: Easing.inOut(Easing.sin) }),
      ), -1, true
    ));
    return function() { cancelAnimation(opacity); };
  }, []);
  var ds = useAnimatedStyle(function() { return { opacity: opacity.value }; });
  return <Animated.View style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#C084FC' }, ds]} />;
}

// ── Cinematic Splash Loading Screen ──
function SplashLoadingScreen({ resolved }) {
  var isDark = resolved !== 'light';
  var bgColor = isDark ? '#0D0B2E' : '#FAF6EE';
  var wheelRotation = useSharedValue(0);
  var logoGlow = useSharedValue(0);

  useEffect(function() {
    wheelRotation.value = withRepeat(
      withTiming(2 * Math.PI, { duration: 30000, easing: Easing.linear }), -1
    );
    logoGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ), -1, true
    );
    return function() {
      cancelAnimation(wheelRotation);
      cancelAnimation(logoGlow);
    };
  }, []);

  var glowStyle = useAnimatedStyle(function() {
    var s = interpolate(logoGlow.value, [0, 1], [1, 1.4]);
    var o = interpolate(logoGlow.value, [0, 1], [0.15, 0.45]);
    return { transform: [{ scale: s }], opacity: o };
  });

  var wheelRadius = 110;

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <LinearGradient
        colors={isDark
          ? ['#0D0B2E', '#1A1040', '#0D0B2E']
          : ['#FAF6EE', '#F0E8D8', '#FAF6EE']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <View style={gs.splashContent}>
        {/* ── Zodiac orbit ring ── */}
        <View style={gs.orbArea}>
          {ZODIAC_GLYPHS.map(function(g, i) {
            return (
              <SplashZodiacGlyph
                key={i} glyph={g} color={isDark ? GLYPH_COLORS[i] : GLYPH_COLORS[i] + 'CC'}
                index={i} total={12} radius={wheelRadius} rotation={wheelRotation}
              />
            );
          })}

          {/* Glow behind logo */}
          <Animated.View style={[gs.logoGlow, {
            backgroundColor: isDark ? 'rgba(147,51,234,0.2)' : 'rgba(107,70,193,0.12)',
          }, glowStyle]} />

          {/* Logo */}
          <Animated.View entering={FadeIn.duration(800)} style={gs.logoWrap}>
            <Image
              source={APP_LOGO_IMAGE}
              style={gs.logo}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* ── App name ── */}
        <Animated.View entering={FadeInUp.duration(600).delay(300)}>
          <Text style={[gs.titleSinhala, {
            color: isDark ? '#FBBF24' : '#8B6914',
          }]}>
            ග්‍රහචාර
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(600).delay(500)}>
          <Text style={[gs.titleEnglish, {
            color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(44,36,24,0.85)',
          }]}>
            GRAHACHARA
          </Text>
        </Animated.View>

        {/* ── Tagline ── */}
        <Animated.View entering={FadeInUp.duration(600).delay(700)}>
          <Text style={[gs.tagline, {
            color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(44,36,24,0.45)',
          }]}>
            Vedic Astrology · ජ්‍යෝතිෂ්‍ය විද්‍යාව
          </Text>
        </Animated.View>

        {/* ── Decorative divider ── */}
        <Animated.View entering={FadeIn.duration(600).delay(900)} style={gs.dividerRow}>
          <View style={[gs.dividerLine, { backgroundColor: isDark ? 'rgba(192,132,252,0.2)' : 'rgba(107,70,193,0.15)' }]} />
          <Text style={{ color: isDark ? '#C084FC' : '#6B46C1', fontSize: 14 }}>✦</Text>
          <View style={[gs.dividerLine, { backgroundColor: isDark ? 'rgba(192,132,252,0.2)' : 'rgba(107,70,193,0.15)' }]} />
        </Animated.View>

        {/* ── Loading dots ── */}
        <Animated.View entering={FadeIn.duration(400).delay(1100)} style={gs.dotsRow}>
          <ShimmerDot index={0} delay={0} />
          <ShimmerDot index={1} delay={150} />
          <ShimmerDot index={2} delay={300} />
        </Animated.View>

        {/* ── Loading text ── */}
        <Animated.View entering={FadeInDown.duration(400).delay(1200)}>
          <Text style={[gs.loadingText, {
            color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(44,36,24,0.3)',
          }]}>
            Consulting the cosmos...
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

function AppGate() {
  var { isLoggedIn, loading, authReady, user } = useAuth();
  var { resolved } = useTheme();
  var [showOnboarding, setShowOnboarding] = useState(null); // null = checking
  var [onboardingPassed, setOnboardingPassed] = useState(false);
  // Track if user was previously logged in (for re-login skip flow)
  var wasLoggedIn = useRef(false);
  var [isReturningUser, setIsReturningUser] = useState(false);
  var lastNotificationId = useRef(null);

  // Derive whether onboarding is complete from user profile
  var onboardingDone = user?.onboardingComplete === true;

  useEffect(function() {
    if (!authReady) return;

    if (!isLoggedIn) {
      // If user was previously logged in this session, they signed out — mark as returning
      if (wasLoggedIn.current) {
        setIsReturningUser(true);
      }
      // Not logged in — show onboarding (Google Sign-In)
      setOnboardingPassed(false);
      setShowOnboarding(true);
    } else if (!onboardingDone && !onboardingPassed) {
      // Logged in but hasn't finished onboarding (name/birth data step)
      setShowOnboarding(true);
    } else {
      // Logged in and onboarding complete — show main app
      wasLoggedIn.current = true;
      setOnboardingPassed(true);
      setShowOnboarding(false);
    }
  }, [isLoggedIn, authReady, onboardingDone]);

  useEffect(function() {
    if (Platform.OS === 'web') return;

    var openFromNotification = function(notification) {
      if (!notification) return;
      var notificationId = notification?.request?.identifier;
      if (notificationId && lastNotificationId.current === notificationId) return;
      lastNotificationId.current = notificationId || String(Date.now());

      var target = getNotificationNavigationTarget(notification);
      var pathname = target.screen || '(tabs)/index';
      if (pathname.charAt(0) !== '/') pathname = '/' + pathname;

      try {
        router.push({ pathname: pathname, params: target.params || {} });
      } catch (e) {
        if (__DEV__) console.warn('[Notifications] Navigation failed:', e && e.message);
      }
    };

    setupNotificationChannels().catch(function(e) {
      if (__DEV__) console.warn('[Notifications] Channel setup failed:', e && e.message);
    });
    ensureDailyGuidanceSchedule().catch(function(e) {
      if (__DEV__) console.warn('[Notifications] Daily schedule check failed:', e && e.message);
    });
    clearBadge().catch(function() {});

    var responseSub = addNotificationResponseListener(function(response) {
      openFromNotification(response?.notification);
      clearBadge().catch(function() {});
    });

    getLastNotificationResponse().then(function(response) {
      openFromNotification(response?.notification);
    });

    return function() {
      if (responseSub && typeof responseSub.remove === 'function') responseSub.remove();
    };
  }, []);

  // Still loading
  if (loading || showOnboarding === null) {
    return <SplashLoadingScreen resolved={resolved} />;
  }

  // Show onboarding
  if (showOnboarding) {
    return (
      <OnboardingScreen 
        isReturningUser={isReturningUser}
        onComplete={function() { 
          setIsReturningUser(false);
          setOnboardingPassed(true); 
          setShowOnboarding(false); 
        }} 
      />
    );
  }

  // Main app
  return (
    <>
      <StatusBar style={resolved === 'light' ? 'dark' : 'light'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

var gs = StyleSheet.create({
  // Splash screen
  splashContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  orbArea: {
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  logoGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  logoWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13,11,46,0.6)',
    borderWidth: 2,
    borderColor: 'rgba(192,132,252,0.3)',
  },
  logo: {
    width: 80,
    height: 80,
  },
  titleSinhala: {
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 2,
    lineHeight: 44,
  },
  titleEnglish: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 6,
    marginTop: 4,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 12,
    letterSpacing: 0.5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  dividerLine: {
    width: 40,
    height: 1,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 28,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 12,
  },
});

function ThemedRootView({ children }) {
  var { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {children}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <ThemeProvider>
          <ThemedRootView>
            <PricingProvider>
              <AuthProvider>
                <AppGate />
              </AuthProvider>
            </PricingProvider>
          </ThemedRootView>
        </ThemeProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
