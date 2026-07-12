/**
 * Baby Kendara screen — thin shell around the shared BabyKendara body.
 * Reachable via router.push('/baby') from Home; the Reports tab renders
 * the same body inline (no navigation).
 */
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CosmicBackground } from '../../components/CosmicBackground';
import useScreenInsets from '../../hooks/useScreenInsets';
import { useLanguage } from '../../contexts/LanguageContext';
import BabyKendara from '../../components/readings/BabyKendara';

export default function BabyScreen() {
  var { language } = useLanguage();
  var insets = useScreenInsets();
  var router = useRouter();
  var si = language === 'si';

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0710' }}>
      <CosmicBackground />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 120, paddingHorizontal: 18 }} showsVerticalScrollIndicator={false}>
        <View style={sh.header}>
          <TouchableOpacity onPress={function () { router.back(); }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={24} color="#F9C6D6" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={sh.title}>{si ? 'බිලිඳු කේන්දරය' : 'Baby Kendara'}</Text>
            <Text style={sh.sub}>{si ? 'ඔබේ බිලිඳාට සුබ නමක් සහ කේන්දරයක්' : "Your newborn's chart, name & rites"}</Text>
          </View>
          <View style={sh.orb}>
            <Ionicons name="happy" size={18} color="#F9A8D4" />
          </View>
        </View>
        <BabyKendara />
      </ScrollView>
    </View>
  );
}

var sh = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '900', color: '#F9C6D6' },
  sub: { fontSize: 12.5, color: 'rgba(249,198,214,0.55)', marginTop: 1 },
  orb: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(244,114,182,0.10)', borderWidth: 1, borderColor: 'rgba(244,114,182,0.28)' },
});
