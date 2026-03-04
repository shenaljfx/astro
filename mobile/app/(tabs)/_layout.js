import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../contexts/LanguageContext';

var TABS = [
  { name: 'index', title: 'Cosmos', titleSi: 'අද දිනය', icon: 'sparkles-outline', iconFocused: 'sparkles' },
  { name: 'kendara', title: 'Chart', titleSi: 'කේන්දරය', icon: 'compass-outline', iconFocused: 'compass' },
  { name: 'horoscope', title: 'Horoscope', titleSi: 'පලාඵල', icon: 'moon-outline', iconFocused: 'moon' },
  { name: 'porondam', title: 'Match', titleSi: 'පොරොන්දම්', icon: 'heart-outline', iconFocused: 'heart' },
  { name: 'chat', title: 'Guide', titleSi: 'AI සහාය', icon: 'rose-outline', iconFocused: 'rose' },
  { name: 'profile', title: 'Aura', titleSi: 'පැතිකඩ', icon: 'color-wand-outline', iconFocused: 'color-wand' },
];function HeaderTitle({ title }) {
  return (
    <View style={s.headerTitleContainer}>
      <Text style={s.headerStar}></Text>
      <Text style={s.headerTitle}>{title}</Text>
      <Text style={s.headerStar}></Text>
    </View>
  );
}

export default function TabLayout() {
  const { t, language } = useLanguage();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: true,
        headerTransparent: true,
        headerTitleAlign: 'center',
        headerTitle: () => {
          let tabKey = 'tabHome';
          if (route.name === 'porondam') tabKey = 'tabPorondam';
          if (route.name === 'kendara') tabKey = 'tabKendara';
          if (route.name === 'horoscope') tabKey = 'tabHoroscope';
          if (route.name === 'chat') tabKey = 'tabChat';
          if (route.name === 'profile') tabKey = 'tabProfile';
          
          return <HeaderTitle title={t(tabKey)} />;
        },
        headerBackground: function() {
          return Platform.OS === 'web' ? (
            <View style={s.webHeader} />
          ) : (
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          );
        },
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: Platform.OS === 'web' ? 'rgba(20, 10, 40, 0.95)' : 'transparent',
          borderTopWidth: 1,
          borderTopColor: 'rgba(251, 191, 36, 0.15)', // Golden accent
          elevation: 0,
          height: Platform.OS === 'ios' ? 85 : 70,
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
          paddingTop: 10,
        },
        tabBarBackground: function() {
          if (Platform.OS === 'web') return null;
          return (
            <View style={StyleSheet.absoluteFill}>
              <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
              <LinearGradient
                colors={['rgba(251, 191, 36, 0.05)', 'transparent']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.3 }}
              />
            </View>
          );
        },
        tabBarActiveTintColor: '#fbbf24', // Mystical Gold
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 4,
          letterSpacing: 0.5,
        },
      })}
    >
      {TABS.map(function(tab) {
        return (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: t('language') === 'si' ? tab.titleSi : tab.title,
              tabBarIcon: function({ focused, color, size }) {
                return (
                  <Ionicons
                    name={focused ? tab.iconFocused : tab.icon}
                    size={24}
                    color={color}
                  />
                );
              },
            }}
          />
        );
      })}
    </Tabs>
  );
}

var s = StyleSheet.create({
  webHeader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 10, 40, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(251, 191, 36, 0.1)'
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fbbf24',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerStar: {
    fontSize: 14,
    color: '#c084fc',
  }
});