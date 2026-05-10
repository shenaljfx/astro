import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';

var CACHE_KEY = '@grahachara_affirmations_v2_';
var INTENTION_KEY = '@grahachara_intention_';
var { width: SCREEN_WIDTH } = Dimensions.get('window');

var CATEGORY_CONFIG = {
  love: { icon: 'heart', gradient: ['rgba(255,107,157,0.12)', 'rgba(255,107,157,0.03)'], accentColor: '#FF6B9D', label: { en: 'LOVE', si: 'ආදරය' } },
  career: { icon: 'briefcase', gradient: ['rgba(255,184,0,0.12)', 'rgba(255,184,0,0.03)'], accentColor: '#FFB800', label: { en: 'CAREER', si: 'වෘත්තිය' } },
  spiritual: { icon: 'sparkles', gradient: ['rgba(147,51,234,0.15)', 'rgba(147,51,234,0.03)'], accentColor: '#B47AFF', label: { en: 'SPIRITUAL', si: 'අධ්‍යාත්මික' } },
};

export default function AffirmationCard({ language, birthDate, birthLat, birthLng, getAffirmations }) {
  var [affirmations, setAffirmations] = useState(null);
  var [activeIndex, setActiveIndex] = useState(0);
  var [savedIntention, setSavedIntention] = useState(null);
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState(null);
  var lang = language || 'en';

  var todayKey = new Date().toISOString().split('T')[0];

  // Load from cache or fetch
  useEffect(function () {
    if (!birthDate) return;
    var cancelled = false;

    async function load() {
      // Check cache first
      try {
        var cached = await AsyncStorage.getItem(CACHE_KEY + todayKey);
        if (cached) {
          var parsed = JSON.parse(cached);
          if (!cancelled) setAffirmations(parsed);
          return;
        }
      } catch (e) { /* ignore cache errors */ }

      // Fetch from API
      if (!cancelled) setLoading(true);
      try {
        var res = await getAffirmations(birthDate, birthLat, birthLng, todayKey);
        if (!cancelled && res && res.data && res.data.affirmations) {
          setAffirmations(res.data.affirmations);
          // Cache for today
          try { await AsyncStorage.setItem(CACHE_KEY + todayKey, JSON.stringify(res.data.affirmations)); } catch (e) { /* */ }
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    // Check saved intention
    AsyncStorage.getItem(INTENTION_KEY + todayKey).then(function (val) {
      if (val && !cancelled) setSavedIntention(JSON.parse(val));
    }).catch(function () {});

    return function () { cancelled = true; };
  }, [birthDate, todayKey]);

  var handleSwipe = useCallback(function (direction) {
    if (!affirmations) return;
    if (Platform.OS !== 'web') {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
    }
    setActiveIndex(function (prev) {
      if (direction === 'next') return prev < affirmations.length - 1 ? prev + 1 : 0;
      return prev > 0 ? prev - 1 : affirmations.length - 1;
    });
  }, [affirmations]);

  var handleSetIntention = useCallback(async function () {
    if (!affirmations || !affirmations[activeIndex]) return;
    var aff = affirmations[activeIndex];
    var intention = { category: aff.category, text: lang === 'si' ? aff.si : aff.en, date: todayKey };

    setSavedIntention(intention);
    try {
      await AsyncStorage.setItem(INTENTION_KEY + todayKey, JSON.stringify(intention));
      if (Platform.OS !== 'web') {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (e) {}
      }
    } catch (e) { /* */ }

    // Schedule morning notification for tomorrow
    try {
      var tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(8, 0, 0, 0);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: lang === 'si' ? '🌟 ඔබේ අද දවසේ අභිප්‍රාය' : '🌟 Your Daily Intention',
          body: intention.text,
          data: { type: 'intention', category: aff.category },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: tomorrow,
          channelId: 'daily-guidance',
        },
      });
    } catch (e) {
      // Notification scheduling is best-effort
      console.log('Intention notification skipped:', e.message);
    }
  }, [affirmations, activeIndex, lang, todayKey]);

  if (!birthDate) return null;

  // Loading state
  if (loading && !affirmations) {
    return (
      <Animated.View entering={FadeInDown.delay(900).springify()}>
        <View style={st.card}>
          <LinearGradient colors={['#140E1E', '#0E0A12', 'rgba(147,51,234,0.04)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <View style={st.headerRow}>
            <View style={st.iconCircle}><Ionicons name="flower-outline" size={14} color="#B47AFF" /></View>
            <Text style={st.headerLabel}>{lang === 'si' ? 'දෛනික ආකර්ෂණ ප්‍රකාශන' : 'DAILY AFFIRMATIONS'}</Text>
          </View>
          <View style={st.loadingBox}>
            <Text style={st.loadingText}>{lang === 'si' ? 'ඔබේ කේන්දරය කියවමින්...' : 'Reading your chart...'}</Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  if (error || !affirmations || affirmations.length === 0) return null;

  var current = affirmations[activeIndex];
  var config = CATEGORY_CONFIG[current.category] || CATEGORY_CONFIG.spiritual;
  var isIntentionSet = savedIntention && savedIntention.category === current.category;

  return (
    <Animated.View entering={FadeInDown.delay(900).springify()}>
      <View style={st.card}>
        <LinearGradient colors={['#140E1E', '#0E0A12', 'rgba(147,51,234,0.04)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

        {/* Header */}
        <View style={st.headerRow}>
          <View style={st.iconCircle}><Ionicons name="flower-outline" size={14} color="#B47AFF" /></View>
          <Text style={st.headerLabel}>{lang === 'si' ? 'දෛනික ආකර්ෂණ ප්‍රකාශන' : 'DAILY AFFIRMATIONS'}</Text>
          <View style={st.dotIndicators}>
            {affirmations.map(function (_, i) {
              return <View key={i} style={[st.dot, i === activeIndex && st.dotActive]} />;
            })}
          </View>
        </View>

        {/* Category badge */}
        <View style={[st.categoryBadge, { borderColor: config.accentColor + '30' }]}>
          <Ionicons name={config.icon} size={12} color={config.accentColor} />
          <Text style={[st.categoryText, { color: config.accentColor }]}>{config.label[lang] || config.label.en}</Text>
        </View>

        {/* Affirmation text */}
        <Animated.View key={activeIndex} entering={FadeIn.duration(400)}>
          <View style={[st.affirmationBox, { borderLeftColor: config.accentColor + '40' }]}>
            <LinearGradient colors={config.gradient} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <Text style={st.affirmationText}>{lang === 'si' ? current.si : current.en}</Text>
            {current.insight && (
              <Text style={st.insightText}>
                <Ionicons name="telescope-outline" size={11} color="rgba(180,122,255,0.50)" />{' '}
                {lang === 'si' ? current.insight.si : current.insight.en}
              </Text>
            )}
          </View>

          {/* Do's and Don'ts */}
          {(current.dos || current.donts) && (
            <View style={st.dosSection}>
              {current.dos && (
                <View style={st.dosColumn}>
                  <View style={st.dosHeader}>
                    <Ionicons name="checkmark-circle" size={14} color="#34D399" />
                    <Text style={st.dosHeaderText}>{lang === 'si' ? 'කරන්න' : 'Do'}</Text>
                  </View>
                  {(lang === 'si' ? current.dos.si : current.dos.en || []).map(function (item, i) {
                    return (
                      <View key={i} style={st.dosItem}>
                        <View style={st.dosDot} />
                        <Text style={st.dosItemText}>{item}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
              {current.donts && (
                <View style={st.dosColumn}>
                  <View style={st.dosHeader}>
                    <Ionicons name="close-circle" size={14} color="#EF4444" />
                    <Text style={[st.dosHeaderText, { color: 'rgba(239,68,68,0.70)' }]}>{lang === 'si' ? 'කරන්න එපා' : "Don't"}</Text>
                  </View>
                  {(lang === 'si' ? current.donts.si : current.donts.en || []).map(function (item, i) {
                    return (
                      <View key={i} style={st.dosItem}>
                        <View style={[st.dosDot, { backgroundColor: 'rgba(239,68,68,0.40)' }]} />
                        <Text style={st.dosItemText}>{item}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </Animated.View>

        {/* Actions row */}
        <View style={st.actionsRow}>
          {/* Navigate left */}
          <TouchableOpacity onPress={function () { handleSwipe('prev'); }} style={st.navBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={18} color="rgba(244,228,188,0.45)" />
          </TouchableOpacity>

          {/* Set Intention button */}
          <TouchableOpacity onPress={handleSetIntention} style={[st.intentionBtn, isIntentionSet && st.intentionBtnActive]} activeOpacity={0.7}>
            <Ionicons
              name={isIntentionSet ? 'bookmark' : 'bookmark-outline'}
              size={16}
              color={isIntentionSet ? '#FFB800' : 'rgba(244,228,188,0.60)'}
            />
            <Text style={[st.intentionText, isIntentionSet && st.intentionTextActive]}>
              {isIntentionSet
                ? (lang === 'si' ? 'අභිප්‍රාය සකසා ඇත ✓' : 'Intention Set ✓')
                : (lang === 'si' ? 'අභිප්‍රාය ලෙස සකසන්න' : 'Set as Intention')}
            </Text>
          </TouchableOpacity>

          {/* Navigate right */}
          <TouchableOpacity onPress={function () { handleSwipe('next'); }} style={st.navBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-forward" size={18} color="rgba(244,228,188,0.45)" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

var st = StyleSheet.create({
  card: {
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1.5, borderColor: 'rgba(147,51,234,0.18)',
    padding: 20, paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
  },
  iconCircle: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(147,51,234,0.10)',
    borderWidth: 1, borderColor: 'rgba(147,51,234,0.25)',
  },
  headerLabel: {
    color: 'rgba(180,122,255,0.65)', fontSize: 11, fontWeight: '800',
    letterSpacing: 1.5, textTransform: 'uppercase', flex: 1,
  },
  dotIndicators: {
    flexDirection: 'row', gap: 5,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(180,122,255,0.20)',
  },
  dotActive: {
    backgroundColor: '#B47AFF', width: 16, borderRadius: 3,
  },
  categoryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    borderWidth: 1, marginBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.20)',
  },
  categoryText: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase',
  },
  affirmationBox: {
    borderRadius: 14, overflow: 'hidden',
    padding: 18, borderLeftWidth: 3,
    marginBottom: 14,
  },
  affirmationText: {
    color: '#F4E4BC', fontSize: 16, fontWeight: '600', lineHeight: 26,
    fontStyle: 'italic', letterSpacing: 0.2,
  },
  insightText: {
    color: 'rgba(180,122,255,0.50)', fontSize: 12, fontWeight: '500',
    marginTop: 10, lineHeight: 18, fontStyle: 'normal',
  },
  actionsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  intentionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 14,
    backgroundColor: 'rgba(255,184,0,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,184,0,0.15)',
  },
  intentionBtnActive: {
    backgroundColor: 'rgba(255,184,0,0.12)',
    borderColor: 'rgba(255,184,0,0.30)',
  },
  intentionText: {
    color: 'rgba(244,228,188,0.60)', fontSize: 12, fontWeight: '700', letterSpacing: 0.5,
  },
  intentionTextActive: {
    color: '#FFB800',
  },
  loadingBox: {
    paddingVertical: 32, alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(180,122,255,0.45)', fontSize: 13, fontStyle: 'italic',
  },
  dosSection: {
    flexDirection: 'row', gap: 10, marginBottom: 14,
  },
  dosColumn: {
    flex: 1, gap: 6,
    paddingHorizontal: 10, paddingVertical: 10, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.20)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
  },
  dosHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4,
  },
  dosHeaderText: {
    color: 'rgba(52,211,153,0.70)', fontSize: 11, fontWeight: '800',
    letterSpacing: 0.5,
  },
  dosItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
  },
  dosDot: {
    width: 4, height: 4, borderRadius: 2, marginTop: 6,
    backgroundColor: 'rgba(52,211,153,0.40)',
  },
  dosItemText: {
    flex: 1, color: 'rgba(244,228,188,0.55)', fontSize: 11, fontWeight: '500',
    lineHeight: 16,
  },
});
