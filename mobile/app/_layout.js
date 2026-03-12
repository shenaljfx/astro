import { Stack } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { LanguageProvider } from '../contexts/LanguageContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import OnboardingScreen from './onboarding';
import CosmicBackground from '../components/CosmicBackground';

function AppGate() {
  var { isLoggedIn, loading, authReady, user } = useAuth();
  var [showOnboarding, setShowOnboarding] = useState(null); // null = checking

  // Derive whether onboarding is complete from user profile
  var onboardingDone = user?.onboardingComplete === true;

  useEffect(function() {
    if (!authReady) return;

    if (!isLoggedIn) {
      // Not logged in — show onboarding (starts at welcome/phone/OTP)
      setShowOnboarding(true);
    } else if (!onboardingDone) {
      // Logged in but hasn't finished onboarding (name/birth data step)
      setShowOnboarding(true);
    } else {
      // Logged in and onboarding complete — show main app
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
      <OnboardingScreen onComplete={function() { setShowOnboarding(false); }} />
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
    <AuthProvider>
      <LanguageProvider>
        <AppGate />
      </LanguageProvider>
    </AuthProvider>
  );
}
