/**
 * Subha Nakath screen — thin shell around the shared NakathPlanner body.
 * Reachable via router.push('/nakath') from Home; the Reports tab renders
 * the same body inline (no navigation).
 */
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CosmicBackground } from '../../components/CosmicBackground';
import useScreenInsets from '../../hooks/useScreenInsets';
import { useLanguage } from '../../contexts/LanguageContext';
import NakathPlanner from '../../components/readings/NakathPlanner';
import MonthAheadNakath from '../../components/readings/MonthAheadNakath';

export default function NakathScreen() {
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
            <Ionicons name="chevron-back" size={24} color="#F5E6C8" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={sh.title}>{si ? 'සුබ නැකැත්' : 'Subha Nakath'}</Text>
            <Text style={sh.sub}>{si ? 'ඕනෑම දෙයකට හොඳම වේලාව' : 'The best time for anything'}</Text>
          </View>
          <View style={sh.orb}>
            <Ionicons name="time" size={18} color="#FFD97A" />
          </View>
        </View>
        <MonthAheadNakath />
        <NakathPlanner />
      </ScrollView>
    </View>
  );
}

var sh = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '900', color: '#F5E6C8' },
  sub: { fontSize: 12.5, color: 'rgba(245,230,200,0.68)', marginTop: 1 },
  orb: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,184,0,0.10)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.28)' },
});
