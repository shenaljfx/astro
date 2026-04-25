import { Stack } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Platform, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from '../contexts/LanguageContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { PricingProvider } from '../contexts/PricingContext';
import OnboardingScreen from './onboarding';
import CosmicLoader from '../components/effects/CosmicLoader';
import { useTheme } from '../contexts/ThemeContext';

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

function AppGate() {
  var { isLoggedIn, loading, authReady, user } = useAuth();
  var { resolved } = useTheme();
  var [showOnboarding, setShowOnboarding] = useState(null); // null = checking
  var [onboardingPassed, setOnboardingPassed] = useState(false);
  // Track if user was previously logged in (for re-login skip flow)
  var wasLoggedIn = useRef(false);
  var [isReturningUser, setIsReturningUser] = useState(false);

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

  // Still loading
  if (loading || showOnboarding === null) {
    return (
      <View style={{ flex: 1, backgroundColor: resolved === 'light' ? '#FBF7F0' : '#1A1730' }}>
        <View style={gs.loadingContainer}>
          <CosmicLoader size={56} color={resolved === 'light' ? '#7C5BD6' : '#B7A6F0'} />
        </View>
      </View>
    );
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
