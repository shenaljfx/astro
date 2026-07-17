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
import { useScreenTracking } from '../utils/screenTracker';
import { PricingProvider } from '../contexts/PricingContext';
import ErrorBoundary from '../components/ErrorBoundary';
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
import { ZODIAC_IMAGES } from '../components/ZodiacIcons';

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

// ── Zodiac PNG images orbiting around the logo ──
var ZODIAC_ORBIT_COLORS = [
  '#EF4444', '#22C55E', '#FBBF24', '#94A3B8', '#F97316', '#C084FC',
  '#EC4899', '#DC2626', '#818CF8', '#64748B', '#06B6D4', '#14B8A6',
];

function SplashZodiacIcon({ index, total, radius, rotation }) {
  var baseAngle = (2 * Math.PI / total) * index;
  var aStyle = useAnimatedStyle(function() {
    var angle = baseAngle + rotation.value;
    var x = Math.cos(angle) * radius;
    var y = Math.sin(angle) * radius;
    var osc = interpolate(Math.sin(rotation.value * 2 + index), [-1, 1], [0.5, 1]);
    return {
      transform: [{ translateX: x }, { translateY: y }, { scale: interpolate(osc, [0.5, 1], [0.8, 1.05]) }],
      opacity: osc,
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }, aStyle]}>
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,184,0,0.08)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.15)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <Image source={ZODIAC_IMAGES[index]} style={{ width: 22, height: 22 }} resizeMode="contain" />
      </View>
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

// ── Starfield (matching website WebGL starfield) ──
var SCREEN_WIDTH = Dimensions.get('window').width;
var SCREEN_HEIGHT = Dimensions.get('window').height;
var STAR_COUNT = Platform.OS === 'web' ? 120 : 80;

// Pre-generate star positions/properties once (like website's starData array)
var STAR_DATA = (function() {
  var stars = [];
  for (var i = 0; i < STAR_COUNT; i++) {
    var sizeRand = Math.random();
    var size = sizeRand < 0.7 ? 1.0 + Math.random() * 1.2 :
               sizeRand < 0.95 ? 2.0 + Math.random() * 1.5 :
               3.0 + Math.random() * 1.5;
    var brightRand = Math.random();
    var brightness = brightRand < 0.5 ? 0.25 + Math.random() * 0.3 :
                     brightRand < 0.85 ? 0.55 + Math.random() * 0.25 :
                     0.8 + Math.random() * 0.2;
    // Color temperature: 0=blue-white, 0.5=white, 1=warm gold
    var colorTemp = Math.random();
    var color = colorTemp < 0.33 ? 'rgba(180,200,255,' :
                colorTemp < 0.66 ? 'rgba(255,255,255,' :
                'rgba(255,220,150,';
    stars.push({
      x: Math.random() * 100,      // % position
      y: Math.random() * 100,
      size: size,
      brightness: brightness,
      color: color,
      flickerDuration: 1200 + Math.random() * 3000,
      flickerDelay: Math.random() * 2000,
      depth: Math.random(),         // 0=far, 1=near (affects parallax)
    });
  }
  return stars;
})();

function StarDot({ star }) {
  var opacity = useSharedValue(star.brightness * 0.3);
  useEffect(function() {
    opacity.value = withDelay(star.flickerDelay, withRepeat(
      withSequence(
        withTiming(star.brightness, { duration: star.flickerDuration, easing: Easing.inOut(Easing.sin) }),
        withTiming(star.brightness * 0.2, { duration: star.flickerDuration * 0.8, easing: Easing.inOut(Easing.sin) }),
      ), -1, true
    ));
    return function() { cancelAnimation(opacity); };
  }, []);
  var aStyle = useAnimatedStyle(function() {
    return { opacity: opacity.value };
  });
  return (
    <Animated.View style={[{
      position: 'absolute',
      left: star.x + '%',
      top: star.y + '%',
      width: star.size,
      height: star.size,
      borderRadius: star.size / 2,
      backgroundColor: star.color + '1)',
    }, aStyle]} />
  );
}

function StarField() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {STAR_DATA.map(function(star, i) {
        return <StarDot key={i} star={star} />;
      })}
    </View>
  );
}

// ── Cinematic Splash Loading Screen ──
function SplashLoadingScreen({ resolved }) {
  var isDark = resolved !== 'light';
  var bgColor = isDark ? '#04030C' : '#FAF6EE';
  var wheelRotation = useSharedValue(0);
  var logoGlow = useSharedValue(0);
  var nebulaShift = useSharedValue(0);
  var ringPulse = useSharedValue(0);

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
    nebulaShift.value = withRepeat(
      withTiming(1, { duration: 12000, easing: Easing.inOut(Easing.sin) }),
      -1, true
    );
    ringPulse.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      -1, true
    );
    return function() {
      cancelAnimation(wheelRotation);
      cancelAnimation(logoGlow);
      cancelAnimation(nebulaShift);
      cancelAnimation(ringPulse);
    };
  }, []);

  var glowStyle = useAnimatedStyle(function() {
    var s = interpolate(logoGlow.value, [0, 1], [1, 1.3]);
    var o = interpolate(logoGlow.value, [0, 1], [0.2, 0.5]);
    return { transform: [{ scale: s }], opacity: o };
  });

  var ringPulseStyle = useAnimatedStyle(function() {
    return {
      transform: [{ scale: interpolate(ringPulse.value, [0, 1], [1, 1.08]) }],
      opacity: interpolate(ringPulse.value, [0, 1], [0.3, 0.12]),
    };
  });

  var nebula1Style = useAnimatedStyle(function() {
    return {
      opacity: interpolate(nebulaShift.value, [0, 1], [0.06, 0.14]),
      transform: [
        { translateX: interpolate(nebulaShift.value, [0, 1], [-15, 15]) },
        { translateY: interpolate(nebulaShift.value, [0, 1], [8, -12]) },
      ],
    };
  });

  var nebula2Style = useAnimatedStyle(function() {
    return {
      opacity: interpolate(nebulaShift.value, [0, 1], [0.08, 0.04]),
      transform: [
        { translateX: interpolate(nebulaShift.value, [0, 1], [12, -18]) },
        { translateY: interpolate(nebulaShift.value, [0, 1], [-6, 14]) },
      ],
    };
  });

  var wheelRadius = 105;

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <LinearGradient
        colors={isDark
          ? ['#04030C', '#0D0B2E', '#1A1040', '#04030C']
          : ['#FAF6EE', '#F0E8D8', '#FAF6EE']}
        locations={isDark ? [0, 0.3, 0.7, 1] : undefined}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Atmospheric nebula blobs */}
      {isDark ? (
        <>
          <Animated.View style={[{ position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(147,51,234,0.05)', top: '10%', right: -100 }, nebula1Style]} />
          <Animated.View style={[{ position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(255,140,0,0.04)', bottom: '15%', left: -80 }, nebula2Style]} />
          <Animated.View style={[{ position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(66,133,244,0.03)', top: '40%', left: '55%' }, nebula1Style]} />
        </>
      ) : null}

      {/* Star field — matching website WebGL starfield */}
      {isDark ? <StarField /> : null}

      <View style={gs.splashContent}>
        {/* ── Zodiac orbit ring ── */}
        <View style={gs.orbArea}>
          {ZODIAC_IMAGES.map(function(_, i) {
            return (
              <SplashZodiacIcon
                key={i}
                index={i} total={12} radius={wheelRadius} rotation={wheelRotation}
              />
            );
          })}

          {/* Pulsing outer ring */}
          <Animated.View style={[{ position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 1, borderColor: 'rgba(255,184,0,0.2)' }, ringPulseStyle]} />

          {/* Inner ring */}
          <View style={{ position: 'absolute', width: 116, height: 116, borderRadius: 58, borderWidth: 1.5, borderColor: 'rgba(255,184,0,0.15)' }} />

          {/* Glow behind logo */}
          <Animated.View style={[gs.logoGlow, {
            backgroundColor: isDark ? 'rgba(255,184,0,0.12)' : 'rgba(107,70,193,0.12)',
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

        {/* ── Brand name — English primary ── */}
        <Animated.View entering={FadeInUp.duration(600).delay(300)}>
          <Text style={[gs.titleEnglish, {
            color: isDark ? '#FFB800' : '#8B6914',
          }]}>
            GRAHACHARA
          </Text>
        </Animated.View>

        {/* ── Tagline — universal ── */}
        <Animated.View entering={FadeInUp.duration(600).delay(500)}>
          <Text style={[gs.tagline, {
            color: isDark ? 'rgba(255,220,180,0.5)' : 'rgba(44,36,24,0.45)',
          }]}>
            Vedic Astrology & Birth Chart Insights
          </Text>
        </Animated.View>

        {/* ── Loading progress bar ── */}
        <Animated.View entering={FadeIn.duration(400).delay(900)} style={gs.progressWrap}>
          <View style={gs.progressTrack}>
            <Animated.View style={[gs.progressFill, { backgroundColor: isDark ? '#FFB800' : '#8B6914' }]} />
          </View>
        </Animated.View>

        {/* ── Loading dots ── */}
        <Animated.View entering={FadeIn.duration(400).delay(1100)} style={gs.dotsRow}>
          <ShimmerDot index={0} delay={0} />
          <ShimmerDot index={1} delay={150} />
          <ShimmerDot index={2} delay={300} />
        </Animated.View>
      </View>
    </View>
  );
}

function AppGate() {
  var { isLoggedIn, loading, authReady, user } = useAuth();
  var { resolved } = useTheme();
  useScreenTracking(); // best-effort behavior heatmap instrumentation (non-fatal)
  var [showOnboarding, setShowOnboarding] = useState(null); // null = checking
  var [onboardingPassed, setOnboardingPassed] = useState(false);
  var [splashReady, setSplashReady] = useState(false);

  // Minimum 2 second splash screen
  useEffect(function () {
    var timer = setTimeout(function () { setSplashReady(true); }, 2000);
    return function () { clearTimeout(timer); };
  }, []);
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
      setShowOnboarding(function (prev) {
        // If the funnel is on screen right now (onboardingComplete flips the
        // moment the paywall chapter resolves), let it play its completion
        // chapter and call onComplete itself — unmounting it mid-transition
        // skipped the celebration screen and raced the paywall overlay.
        return prev === true ? prev : false;
      });
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

  // Still loading or splash minimum not met
  if (loading || showOnboarding === null || !splashReady) {
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
    marginBottom: 32,
  },
  logoGlow: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
  },
  logoWrap: {
    width: 92,
    height: 92,
    borderRadius: 46,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(4,3,12,0.8)',
    borderWidth: 2,
    borderColor: 'rgba(255,184,0,0.25)',
  },
  logo: {
    width: 72,
    height: 72,
  },
  titleEnglish: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 6,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 10,
    letterSpacing: 0.5,
  },
  progressWrap: {
    width: 120,
    marginTop: 28,
  },
  progressTrack: {
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,184,0,0.1)',
    overflow: 'hidden',
  },
  progressFill: {
    width: '60%',
    height: '100%',
    borderRadius: 1,
    opacity: 0.6,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    alignItems: 'center',
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
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
