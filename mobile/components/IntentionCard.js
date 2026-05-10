import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

var INTENTION_KEY = '@grahachara_intention_';

var CATEGORY_STYLE = {
  love: { icon: 'heart', color: '#FF6B9D', gradient: ['rgba(255,107,157,0.10)', 'rgba(255,107,157,0.02)'] },
  career: { icon: 'rocket', color: '#FBBF24', gradient: ['rgba(251,191,36,0.10)', 'rgba(251,191,36,0.02)'] },
  spiritual: { icon: 'sparkles', color: '#B47AFF', gradient: ['rgba(180,122,255,0.10)', 'rgba(180,122,255,0.02)'] },
};

export default function IntentionCard({ language }) {
  var [intention, setIntention] = useState(null);
  var lang = language || 'en';
  var todayKey = new Date().toISOString().split('T')[0];

  useEffect(function () {
    var cancelled = false;
    AsyncStorage.getItem(INTENTION_KEY + todayKey).then(function (val) {
      if (val && !cancelled) setIntention(JSON.parse(val));
    }).catch(function () {});
    return function () { cancelled = true; };
  }, [todayKey]);

  if (!intention) return null;

  var cat = CATEGORY_STYLE[intention.category] || CATEGORY_STYLE.spiritual;

  return (
    <Animated.View entering={FadeInDown.delay(250).springify()}>
      <View style={st.card}>
        <LinearGradient
          colors={cat.gradient}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />

        {/* Header */}
        <View style={st.headerRow}>
          <View style={[st.iconCircle, { borderColor: cat.color + '30', backgroundColor: cat.color + '12' }]}>
            <Ionicons name="compass" size={13} color={cat.color} />
          </View>
          <Text style={st.headerLabel}>
            {lang === 'si' ? 'අද දවසේ අභිප්‍රාය' : 'TODAY\'S INTENTION'}
          </Text>
        </View>

        {/* Intention text */}
        <View style={st.body}>
          <Text style={st.quoteOpen}>"</Text>
          <Text style={[st.intentionText, { color: cat.color }]}>{intention.text}</Text>
          <Text style={st.quoteClose}>"</Text>
        </View>

        {/* Category badge */}
        <View style={st.footer}>
          <View style={[st.badge, { borderColor: cat.color + '25' }]}>
            <Ionicons name={cat.icon} size={11} color={cat.color} />
            <Text style={[st.badgeText, { color: cat.color }]}>
              {intention.category.charAt(0).toUpperCase() + intention.category.slice(1)}
            </Text>
          </View>
          <Text style={st.remind}>
            {lang === 'si' ? '🔔 හෙට උදේ 7ට මතක් කරනවා' : '🔔 Reminder set for 7 AM'}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

var st = StyleSheet.create({
  card: {
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1.5, borderColor: 'rgba(180,122,255,0.12)',
    padding: 18, paddingBottom: 14,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14,
  },
  iconCircle: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  headerLabel: {
    color: 'rgba(244,228,188,0.45)', fontSize: 10, fontWeight: '800',
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  body: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 4, marginBottom: 14,
  },
  quoteOpen: {
    fontSize: 28, fontWeight: '300', color: 'rgba(244,228,188,0.15)',
    marginTop: -8, marginRight: 4, lineHeight: 32,
  },
  intentionText: {
    flex: 1, fontSize: 16, fontWeight: '700', lineHeight: 24,
    letterSpacing: 0.2,
  },
  quoteClose: {
    fontSize: 28, fontWeight: '300', color: 'rgba(244,228,188,0.15)',
    alignSelf: 'flex-end', marginLeft: 4, marginBottom: -4, lineHeight: 32,
  },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
    borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.20)',
  },
  badgeText: {
    fontSize: 10, fontWeight: '700', letterSpacing: 0.3,
  },
  remind: {
    fontSize: 10, color: 'rgba(244,228,188,0.30)', fontWeight: '500',
  },
});
