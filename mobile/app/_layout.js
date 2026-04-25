import { Stack } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Platform, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from '../contexts/LanguageContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { PricingProvider } from '../contexts/PricingContext';
import OnboardingScreen from './onboarding';
import CosmicLoader from '../components/effects/CosmicLoader';

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

// Fix white background on web — inject CSS into html/body
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  var style = document.createElement('style');
  style.textContent = 'html,body,#root{background-color:#030014!important;margin:0;padding:0;overflow:hidden;height:100%;width:100%;}';
  document.head.appendChild(style);
}

function AppGate() {
  var { isLoggedIn, loading, authReady, user } = useAuth();
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
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        <View style={gs.loadingContainer}>
          <CosmicLoader size={56} color="#7dd3fc" />
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
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

var gs = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: '#030014' }}>
        <LanguageProvider>
          <PricingProvider>
            <AuthProvider>
              <AppGate />
            </AuthProvider>
          </PricingProvider>
        </LanguageProvider>
      </View>
    </SafeAreaProvider>
  );
}
