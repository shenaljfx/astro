import { Stack } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { LanguageProvider } from '../contexts/LanguageContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import OnboardingScreen from './onboarding';
import CosmicBackground from '../components/CosmicBackground';

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

  // Derive whether onboarding is complete from user profile
  var onboardingDone = user?.onboardingComplete === true;

  useEffect(function() {
    if (!authReady) return;

    if (!isLoggedIn) {
      // Not logged in — show onboarding (starts at welcome/phone/OTP)
      setOnboardingPassed(false);
      setShowOnboarding(true);
    } else if (!onboardingDone && !onboardingPassed) {
      // Logged in but hasn't finished onboarding (name/birth data step)
      // Only redirect if user hasn't already completed onboarding this session
      setShowOnboarding(true);
    } else {
      // Logged in and onboarding complete — show main app
      // Once passed, never go back to onboarding (until sign out)
      setOnboardingPassed(true);
      setShowOnboarding(false);
    }
  }, [isLoggedIn, authReady, onboardingDone]);

  // Still loading
  if (loading || showOnboarding === null) {
    return (
      <CosmicBackground>
        <View style={gs.loadingContainer}>
          <ActivityIndicator size="large" color="#7dd3fc" />
        </View>
      </CosmicBackground>
    );
  }

  // Show onboarding
  if (showOnboarding) {
    return (
      <OnboardingScreen onComplete={function() { setOnboardingPassed(true); setShowOnboarding(false); }} />
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
    <View style={{ flex: 1, backgroundColor: '#030014' }}>
      <AuthProvider>
        <LanguageProvider>
          <AppGate />
        </LanguageProvider>
      </AuthProvider>
    </View>
  );
}
