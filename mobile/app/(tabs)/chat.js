import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, StyleSheet, Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  FadeInUp, FadeIn, FadeInDown,
  useSharedValue, useAnimatedStyle, withRepeat,
  withSequence, withTiming, withDelay, withSpring, interpolate, Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DesktopScreenWrapper, { useDesktopCtx } from '../../components/DesktopScreenWrapper';
import SpringPressable from '../../components/effects/SpringPressable';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { boxShadow, textShadow } from '../../utils/shadow';
import useKeyboard from '../../hooks/useKeyboard';
import { useTheme } from '../../contexts/ThemeContext';
import { screenColors } from '../../constants/theme';
import useReducedMotion from '../../hooks/useReducedMotion';
import useLowEndDevice from '../../hooks/useLowEndDevice';
import { CosmicBackground } from '../../components/CosmicBackground';

import { TAB_BAR_VISUAL_HEIGHT } from './_layout';

var { width: SW, height: SH } = Dimensions.get('window');
var DAILY_LIMIT = 5;
var STORAGE_KEY_PREFIX = '@grahachara_chat_usage_';

var ORACLE_COSMIC = require('../../assets/oracle/cosmic-guide.png');
var ORACLE_DREAM = require('../../assets/oracle/dream-oracle.png');

// Returns per-user storage key (falls back to 'guest' when not logged in)
function usageKey(uid) {
  return STORAGE_KEY_PREFIX + (uid || 'guest');
}

// Daily usage tracker — keyed by uid so switching accounts starts fresh
async function getUsageToday(uid) {
  try {
    var raw = await AsyncStorage.getItem(usageKey(uid));
    if (!raw) return { date: '', count: 0 };
    var parsed = JSON.parse(raw);
    var today = new Date().toISOString().slice(0, 10);
    if (parsed.date !== today) return { date: today, count: 0 };
    return parsed;
  } catch (e) {
    return { date: '', count: 0 };
  }
}

async function incrementUsage(uid) {
  var today = new Date().toISOString().slice(0, 10);
  var usage = await getUsageToday(uid);
  var newCount = (usage.date === today ? usage.count : 0) + 1;
  var newUsage = { date: today, count: newCount };
  await AsyncStorage.setItem(usageKey(uid), JSON.stringify(newUsage));
  return newUsage;
}

// Thinking Dots — cosmic orbiting particles indicator
// Each dot is its own component so hooks aren't called inside a loop (Rules of Hooks)
var THINK_COLORS = ['#FF8C00', '#FF6D00', '#FFB800', '#E65100', '#34D399'];

function ThinkDot({ color, index }) {
  var v = useSharedValue(0);
  useEffect(function () {
    var to = setTimeout(function () {
      v.value = withRepeat(
        withSequence(withTiming(1, { duration: 600 }), withTiming(0, { duration: 600 })),
        -1
      );
    }, index * 120);
    return function () { clearTimeout(to); };
  }, []);
  var anim = useAnimatedStyle(function () {
    return {
      opacity: interpolate(v.value, [0, 1], [0.2, 1]),
      transform: [
        { translateY: interpolate(v.value, [0, 1], [0, -3]) },
        { scale: interpolate(v.value, [0, 1], [0.7, 1.2]) },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        { width: 6, height: 6, borderRadius: 3, backgroundColor: color, ...boxShadow(color, { width: 0, height: 0 }, 0.8, 4) },
        anim,
      ]}
    />
  );
}

function ThinkingDots() {
  return (
    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 14 }}>
      {THINK_COLORS.map(function (c, i) {
        return <ThinkDot key={i} color={c} index={i} />;
      })}
    </View>
  );
}

// Chat Bubble
function ChatBubble({ msg, isDesktop }) {
  var isAi = msg.role === 'assistant';
  if (!isAi) {
    return (
      <Animated.View entering={FadeInUp.duration(250).springify()} style={[s.userWrap, isDesktop && sd.userWrapD]}>
        <LinearGradient colors={['#FF8C00', '#FF6D00', '#E65100']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.userBubble}>
          <LinearGradient colors={['rgba(255,255,255,0.12)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', borderTopLeftRadius: 20, borderTopRightRadius: 20 }} />
          <Text style={[s.userText, isDesktop && { fontSize: 15 }]}>{msg.content}</Text>
        </LinearGradient>
      </Animated.View>
    );
  }
  return (
    <Animated.View entering={FadeInUp.duration(300).springify()} style={[s.aiWrap, isDesktop && sd.aiWrapD]}>
      <View style={s.aiDot}>
        <LinearGradient colors={['#FF8C00', '#FF6D00', '#E65100']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <Text style={{ fontSize: 10 }}>{'\u2726'}</Text>
      </View>
      <View style={[s.aiBubble, isDesktop && sd.aiBubbleD]}>
        <LinearGradient
          colors={['rgba(147,51,234,0.06)', 'rgba(255,107,0,0.03)', 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />
        <Text style={[s.aiText, isDesktop && { fontSize: 15, lineHeight: 23 }]}>{msg.content}</Text>
      </View>
    </Animated.View>
  );
}

// Limit Card
function LimitCard({ remaining, t }) {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={s.limitCard}>
      <LinearGradient
        colors={remaining > 0 ? ['rgba(255,107,0,0.08)', 'rgba(224,64,251,0.05)'] : ['rgba(255,50,50,0.1)', 'rgba(255,50,50,0.03)']}
        style={StyleSheet.absoluteFill}
      />
      <Ionicons
        name={remaining > 0 ? 'chatbubble-ellipses-outline' : 'lock-closed-outline'}
        size={14}
        color={remaining > 0 ? '#FF8C33' : '#FF6B6B'}
      />
      <Text style={[s.limitText, remaining <= 0 && { color: '#FF6B6B' }]}>
        {remaining > 0 ? remaining + ' ' + t('chatQuestionsLeft') : t('chatNoQuestions')}
      </Text>
      <View style={s.limitDotsRow}>
        {Array.from({ length: DAILY_LIMIT }).map(function (_, i) {
          return (
            <View key={i} style={[s.limitDot, i < (DAILY_LIMIT - remaining) ? s.dotUsed : s.dotFree]} />
          );
        })}
      </View>
    </Animated.View>
  );
}

// Mode Toggle (Chat vs Dream)
function ModeToggle({ mode, setMode, t }) {
  return (
    <View style={s.modeRow}>
      <TouchableOpacity onPress={function () { setMode('chat'); }} activeOpacity={0.7} style={s.modeBtn}>
        <LinearGradient
          colors={mode === 'chat' ? ['#FF8C00', '#FF6D00'] : ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.04)']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={s.modeBtnBg}
        >
          <Ionicons name="chatbubble-ellipses" size={14} color={mode === 'chat' ? '#FFF' : 'rgba(255,255,255,0.4)'} />
          <Text style={[s.modeBtnText, mode === 'chat' && { color: '#FFF1D0' }]}>{t('chatModeChat')}</Text>
        </LinearGradient>
      </TouchableOpacity>
      <TouchableOpacity onPress={function () { setMode('dream'); }} activeOpacity={0.7} style={s.modeBtn}>
        <LinearGradient
          colors={mode === 'dream' ? ['#FF8C00', '#E65100'] : ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.04)']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={s.modeBtnBg}
        >
          <Ionicons name="moon" size={14} color={mode === 'dream' ? '#FFF' : 'rgba(255,255,255,0.4)'} />
          <Text style={[s.modeBtnText, mode === 'dream' && { color: '#FFF1D0' }]}>{t('chatModeDream')}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

// Quick Chips (language-aware + dream chips)
function QuickChips({ onSelect, language, mode }) {
  var chatChips = language === 'si'
    ? [
        { icon: 'sunny-outline', label: 'අද දවසේ ග්‍රහ බලපෑම?' },
        { icon: 'heart-outline', label: 'මගේ ආදර සබඳතා?' },
        { icon: 'time-outline', label: 'සුබ මුහුර්ත මොනවාද?' },
        { icon: 'color-palette-outline', label: 'මට ගැළපෙන වර්ණ?' },
        { icon: 'briefcase-outline', label: 'මගේ වෘත්තීය ගමන?' },
        { icon: 'airplane-outline', label: 'විදෙස් ගමන් සඳහා?' },
      ]
    : [
        { icon: 'sunny-outline', label: "Today's Cosmic Energy?" },
        { icon: 'heart-outline', label: 'Relationship Deep Dive' },
        { icon: 'time-outline', label: 'Auspicious Windows' },
        { icon: 'color-palette-outline', label: 'My Power Colors' },
        { icon: 'briefcase-outline', label: 'Career Trajectory' },
        { icon: 'airplane-outline', label: 'Favorable Travel' },
      ];

  var dreamChips = language === 'si'
    ? [
        { icon: 'water-outline', label: 'ජලය සිහිනෙන් දැකීම' },
        { icon: 'flash-outline', label: 'පසුපස හඹා එනවා දැකීම' },
        { icon: 'skull-outline', label: 'මරණය සම්බන්ධ සිහින' },
        { icon: 'home-outline', label: 'පැරණි නිවසක් දැකීම' },
        { icon: 'paw-outline', label: 'සතුන් සිහිනෙන් දැකීම' },
        { icon: 'cloudy-night-outline', label: 'අහසේ පියාසර කිරීම' },
      ]
    : [
        { icon: 'water-outline', label: 'Deep water dreams' },
        { icon: 'flash-outline', label: 'Being pursued' },
        { icon: 'skull-outline', label: 'Visions of endings' },
        { icon: 'home-outline', label: 'Ancestral homes' },
        { icon: 'paw-outline', label: 'Animal messengers' },
        { icon: 'cloudy-night-outline', label: 'Flight and falling' },
      ];

  var chips = mode === 'dream' ? dreamChips : chatChips;
  var chipColors = mode === 'dream'
    ? ['rgba(124,58,237,0.15)', 'rgba(224,64,251,0.08)']
    : ['rgba(255,107,0,0.12)', 'rgba(224,64,251,0.06)'];
  var chipBorder = mode === 'dream' ? 'rgba(124,58,237,0.25)' : 'rgba(255,107,0,0.18)';
  var chipIconColor = mode === 'dream' ? '#FF8C00' : '#FF8C33';

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
      {chips.map(function (ch, i) {
        return (
          <SpringPressable key={i} onPress={function () { onSelect(ch.label); }} haptic="light" scalePressed={0.92}>
            <LinearGradient colors={chipColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.chip, { borderColor: chipBorder }]}>
              <Ionicons name={ch.icon} size={14} color={chipIconColor} />
              <Text style={s.chipLabel}>{ch.label}</Text>
            </LinearGradient>
          </SpringPressable>
        );
      })}
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Oracle Selection — Mystical Tarot Card Gateway
// ═══════════════════════════════════════════════════════════════════════

function OracleSelection({ onSelect, t }) {
  var reduced = useReducedMotion();
  var lowEnd = useLowEndDevice();
  var oraInsets = useSafeAreaInsets();

  var cards = [
    {
      key: 'chat', image: ORACLE_COSMIC,
      title: t('chatModeChat'), desc: t('chatCosmicDesc'),
      gradient: ['#6D28D9', '#4C1D95', '#2E1065'],
      glow: '#A78BFA', icon: 'sparkles',
    },
    {
      key: 'dream', image: ORACLE_DREAM,
      title: t('chatModeDream'), desc: t('chatDreamDesc'),
      gradient: ['#92400E', '#78350F', '#451A03'],
      glow: '#FFB800', icon: 'moon',
    },
  ];

  return (
    <View style={os.container}>
      {/* Cosmic Background */}
      <CosmicBackground reduced={reduced} lowEnd={lowEnd} />

      <ScrollView
        contentContainerStyle={[
          os.scrollContent,
          {
            paddingTop: Math.max(oraInsets.top, 12) + 24,
            paddingBottom: TAB_BAR_VISUAL_HEIGHT + Math.max(oraInsets.bottom, 8) + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
      {/* Title */}
      <View style={os.titleWrap}>
        <Text style={os.eyebrow}>{'✦ ' + (t('chatOracleTitle') || 'Choose Your Oracle') + ' ✦'}</Text>
        <Text style={os.subtitle}>{t('chatOracleSub')}</Text>
      </View>

      {/* Card pair — equal sizing, no animation */}
      <View style={os.cardsRow}>
        {cards.map(function (card) {
          return (
            <View key={card.key} style={os.cardOuter}>
              <SpringPressable onPress={function () { onSelect(card.key); }} haptic="medium" scalePressed={0.93}>
                <View style={os.card}>
                  {/* Card image — aspect ratio locked */}
                  <View style={os.imageWrap}>
                    <Image
                      source={card.image}
                      resizeMode="cover"
                      style={{ width: '100%', aspectRatio: 2 / 3 }}
                      fadeDuration={0}
                    />
                    <LinearGradient
                      colors={['rgba(255,255,255,0.15)', 'transparent']}
                      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '20%' }}
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)']}
                      locations={[0.35, 0.65, 1]}
                      style={os.vignette}
                    />
                  </View>

                  {/* Label area — fixed minHeight for equal cards */}
                  <LinearGradient colors={card.gradient} style={os.labelArea}>
                    <View style={os.iconRow}>
                      <View style={[os.iconCircle, { backgroundColor: card.glow + '18' }]}>
                        <Ionicons name={card.icon} size={14} color={card.glow} />
                      </View>
                    </View>
                    <Text style={[os.cardTitle, { ...textShadow(card.glow + '60', { width: 0, height: 0 }, 12) }]}>{card.title}</Text>
                    <Text style={os.cardDesc} numberOfLines={2}>{card.desc}</Text>
                    <View style={os.tapRow}>
                      <View style={[os.tapPill, { backgroundColor: card.glow + '15', borderColor: card.glow + '25' }]}>
                        <Ionicons name="arrow-forward" size={11} color={card.glow} />
                      </View>
                    </View>
                  </LinearGradient>

                  {/* Border */}
                  <View style={[os.cardBorder, { borderColor: card.glow + '30' }]} />
                </View>
              </SpringPressable>
            </View>
          );
        })}
      </View>

      {/* Bottom hint */}
      <View style={os.hintWrap}>
        <Text style={os.hintText}>
          {t('chatQuestionsLeft') ? '✧ ' + DAILY_LIMIT + ' ' + t('chatQuestionsLeft') + ' ✧' : '✧ Tap a card to begin ✧'}
        </Text>
      </View>
      </ScrollView>
    </View>
  );
}

var os = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  titleWrap: { alignItems: 'center', marginBottom: 32, paddingHorizontal: 24 },
  eyebrow: {
    fontSize: 18, fontWeight: '900', color: '#E8D5B5',
    letterSpacing: 2, textAlign: 'center', textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.35)',
    marginTop: 10, textAlign: 'center', letterSpacing: 0.5, lineHeight: 18,
  },
  cardsRow: { flexDirection: 'row', gap: 14, justifyContent: 'center', alignItems: 'stretch', paddingHorizontal: 16, maxWidth: 400, alignSelf: 'center', width: '100%' },
  cardOuter: { flex: 1 },
  card: { flex: 1, borderRadius: 18, overflow: 'hidden', backgroundColor: '#0A0618' },
  imageWrap: { overflow: 'hidden', borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  vignette: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
  labelArea: {
    flex: 1, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 14,
    alignItems: 'center', justifyContent: 'space-between',
  },
  iconRow: { marginBottom: 6 },
  iconCircle: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14, fontWeight: '900', color: '#FFF1D0',
    letterSpacing: 0.8, textAlign: 'center',
  },
  cardDesc: {
    fontSize: 10, fontWeight: '500', color: 'rgba(255,255,255,0.45)',
    marginTop: 5, textAlign: 'center', lineHeight: 14, paddingHorizontal: 2,
  },
  tapRow: { marginTop: 10 },
  tapPill: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  cardBorder: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 18, borderWidth: 1.5,
  },
  hintWrap: { marginTop: 28, alignItems: 'center' },
  hintText: {
    fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.22)',
    letterSpacing: 2, textTransform: 'uppercase',
  },
});

// MAIN CHAT SCREEN
export default function ChatScreen() {
  var { t, language } = useLanguage();
  var { user } = useAuth();
  var { colors, gradients, resolved } = useTheme();
  var sc = screenColors(colors);
  var insets = useSafeAreaInsets();
  var isDesktop = useDesktopCtx();
  var [msg, setMsg] = useState('');
  var [msgs, setMsgs] = useState([]);
  var [loading, setLoading] = useState(false);
  var [remaining, setRemaining] = useState(DAILY_LIMIT);
  var [mode, setMode] = useState('chat');
  var [selectedMode, setSelectedMode] = useState(null);
  var scroll = useRef(null);

  // Derive birth data from user profile
  var birthData   = user?.birthData   || null;
  var birthDate   = birthData?.dateTime   || null;
  var birthLat    = birthData?.lat        || null;
  var birthLng    = birthData?.lng        || null;

  // Set welcome message based on language
  useEffect(function () {
    setMsgs([{ role: 'assistant', content: t('initialChat') }]);
  }, [language]);

  useEffect(function () {
    getUsageToday(user?.uid).then(function (u) {
      var today = new Date().toISOString().slice(0, 10);
      var used = u.date === today ? u.count : 0;
      setRemaining(Math.max(0, DAILY_LIMIT - used));
    });
    api.getChatQuota()
      .then(function(res) {
        if (res && typeof res.remaining === 'number') {
          setRemaining(res.remaining);
          var today = new Date().toISOString().slice(0, 10);
          var used = DAILY_LIMIT - res.remaining;
          AsyncStorage.setItem(usageKey(user?.uid), JSON.stringify({ date: today, count: used })).catch(function() {});
        }
      })
      .catch(function() {});
  }, [user]);

  var send = useCallback(async function (text) {
    var content = (typeof text === 'string' ? text : msg).trim();
    if (!content || loading) return;
    if (remaining <= 0) {
      setMsgs(function (p) { return p.concat([{ role: 'assistant', content: t('chatLimitMsg') }]); });
      return;
    }
    var finalContent = content;
    if (mode === 'dream') {
      var dreamPrefix = language === 'si'
        ? '[DREAM ANALYSIS REQUEST - respond in Sinhala] User dreamed: '
        : '[DREAM ANALYSIS REQUEST] User dreamed: ';
      finalContent = dreamPrefix + content;
    }
    setMsgs(function (p) { return p.concat([{ role: 'user', content: content }]); });
    setMsg('');
    setLoading(true);
    try {
      var history = msgs.slice(1).map(function (m) { return { role: m.role, content: m.content }; });
      var res = await api.askAstrologer(finalContent, {
        language:    language,
        chatHistory: history,
        birthDate:   birthDate,
        birthLat:    birthLat,
        birthLng:    birthLng,
      });
      var reply = (res.data && (res.data.message || res.data.response)) || t('starsClouded');
      setMsgs(function (p) { return p.concat([{ role: 'assistant', content: reply }]); });
      if (typeof res.remaining === 'number') {
        setRemaining(res.remaining);
        var today = new Date().toISOString().slice(0, 10);
        var used = DAILY_LIMIT - res.remaining;
        AsyncStorage.setItem(usageKey(user?.uid), JSON.stringify({ date: today, count: used })).catch(function() {});
      } else {
        var usage = await incrementUsage(user?.uid);
        setRemaining(Math.max(0, DAILY_LIMIT - usage.count));
      }
    } catch (e) {
      var errMsg;
      if (e && e.name === 'AbortError') {
        errMsg = t('chatTimeout');
      } else if (e && e.statusCode === 401) {
        errMsg = t('chatAuthExpired');
      } else if (e && e.statusCode === 429) {
        errMsg = t('chatRateLimit');
      } else if (e && e.message && (e.message.indexOf('Network') !== -1 || e.message.indexOf('network') !== -1 || e.message.indexOf('Failed to fetch') !== -1)) {
        errMsg = t('cosmosConnectionFailed');
      } else {
        errMsg = t('starsClouded');
      }
      setMsgs(function (p) { return p.concat([{ role: 'assistant', content: errMsg }]); });
    } finally {
      setLoading(false);
    }
  }, [msg, language, t, loading, remaining, mode, msgs, birthDate, birthLat, birthLng]);

  useEffect(function () {
    var to = setTimeout(function () { if (scroll.current) scroll.current.scrollToEnd({ animated: true }); }, 120);
    return function () { clearTimeout(to); };
  }, [msgs, loading]);

  var topPad = isDesktop ? 0 : Math.max(insets.top, 10) + 6;
  // Keyboard state for responsive layout adjustments
  var kb = useKeyboard();

  // When keyboard opens, scroll to the latest message (WhatsApp behavior)
  useEffect(function () {
    if (!kb.isOpen) return;
    var to = setTimeout(function () {
      if (scroll.current) scroll.current.scrollToEnd({ animated: true });
    }, 150);
    return function () { clearTimeout(to); };
  }, [kb.isOpen]);

  // ── DESKTOP LAYOUT ────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <DesktopScreenWrapper routeName="chat">
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={sd.shell}>
            <View style={sd.panel}>

              {/* ── Panel header ── */}
              <View style={sd.panelHeader}>
                <View style={sd.panelHeaderLeft}>
                  <View style={[sd.avatarLg, { borderColor: mode === 'dream' ? 'rgba(255,140,0,0.5)' : 'rgba(255,107,0,0.5)' }]}>
                    <LinearGradient colors={mode === 'dream' ? ['#FF8C00', '#E65100'] : ['#FF8C00', '#FF6D00']} style={StyleSheet.absoluteFill} />
                    <Ionicons name={mode === 'dream' ? 'moon' : 'sparkles'} size={22} color="#FFF" />
                  </View>
                  <View>
                    <Text style={sd.panelTitle}>{mode === 'dream' ? t('chatDreamTitle') : t('chatTitle')}</Text>
                    <View style={sd.statusRow}>
                      <View style={[sd.statusDot, { backgroundColor: loading ? '#FFB800' : '#34D399' }]} />
                      <Text style={sd.statusText}>{loading ? t('consultingCosmos') : t('askUniverse')}</Text>
                    </View>
                  </View>
                </View>
                <View style={sd.panelHeaderRight}>
                  <View style={[sd.birthBadge, { backgroundColor: birthDate ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.05)', borderColor: birthDate ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.1)' }]}>
                    <Ionicons name={birthDate ? 'planet' : 'planet-outline'} size={13} color={birthDate ? '#34D399' : 'rgba(255,255,255,0.3)'} />
                    <Text style={[sd.birthBadgeText, { color: birthDate ? '#34D399' : 'rgba(255,255,255,0.3)' }]}>
                      {birthDate ? t('chartLoaded') || 'Chart ✓' : t('noBirthData') || 'No chart'}
                    </Text>
                  </View>
                  <View style={sd.modeToggleRow}>
                    <TouchableOpacity onPress={function () { setMode('chat'); }} activeOpacity={0.7}
                      style={[sd.modeChip, mode === 'chat' && sd.modeChipActive]}>
                      <LinearGradient
                        colors={mode === 'chat' ? ['#FF8C00', '#FF6D00'] : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.06)']}
                        style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      />
                      <Ionicons name="chatbubble-ellipses" size={13} color={mode === 'chat' ? '#FFF' : 'rgba(255,255,255,0.4)'} />
                      <Text style={[sd.modeChipText, mode === 'chat' && { color: '#FFF1D0' }]}>{t('chatModeChat')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={function () { setMode('dream'); }} activeOpacity={0.7}
                      style={[sd.modeChip, mode === 'dream' && sd.modeChipActive]}>
                      <LinearGradient
                        colors={mode === 'dream' ? ['#FF8C00', '#E65100'] : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.06)']}
                        style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      />
                      <Ionicons name="moon" size={13} color={mode === 'dream' ? '#FFF' : 'rgba(255,255,255,0.4)'} />
                      <Text style={[sd.modeChipText, mode === 'dream' && { color: '#FFF1D0' }]}>{t('chatModeDream')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* ── Separator ── */}
              <View style={sd.separator} />

              {/* ── Limit bar ── */}
              <View style={sd.limitBar}>
                <Ionicons
                  name={remaining > 0 ? 'chatbubble-ellipses-outline' : 'lock-closed-outline'}
                  size={13} color={remaining > 0 ? '#FF8C33' : '#FF6B6B'}
                />
                <Text style={[sd.limitText, remaining <= 0 && { color: '#FF6B6B' }]}>
                  {remaining > 0 ? remaining + ' ' + t('chatQuestionsLeft') : t('chatNoQuestions')}
                </Text>
                <View style={sd.limitDots}>
                  {Array.from({ length: DAILY_LIMIT }).map(function (_, i) {
                    return <View key={i} style={[sd.dot, i < (DAILY_LIMIT - remaining) ? sd.dotUsed : sd.dotFree]} />;
                  })}
                </View>
              </View>

              {/* ── Messages + chips + input ── */}
              <KeyboardAvoidingView
                style={{ flex: 1, minHeight: 0 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              >
                <ScrollView
                  ref={scroll}
                  style={{ flex: 1 }}
                  contentContainerStyle={sd.msgList}
                  showsVerticalScrollIndicator={false}
                  overScrollMode="never"
                  bounces={false}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                >
                  {msgs.map(function (m, i) { return <ChatBubble key={i} msg={m} isDesktop />; })}
                  {loading && (
                    <Animated.View entering={FadeInUp.duration(200)} style={sd.thinkRow}>
                      <View style={sd.aiDotSm}>
                        <LinearGradient colors={['#FF8C00', '#FF6D00']} style={StyleSheet.absoluteFill} />
                        <Text style={{ fontSize: 10 }}>{'\u2726'}</Text>
                      </View>
                      <View style={sd.thinkBubble}><ThinkingDots /></View>
                    </Animated.View>
                  )}
                  <View style={{ height: 16 }} />
                </ScrollView>

                {msgs.length <= 2 && !loading && remaining > 0 && (
                  <QuickChips onSelect={send} language={language} mode={mode} />
                )}

                <View style={sd.inputArea}>
                  <View style={sd.inputRow}>
                    <TextInput
                      style={sd.input}
                      value={msg}
                      onChangeText={setMsg}
                      placeholder={remaining > 0 ? (mode === 'dream' ? t('chatDreamPlaceholder') : t('chatPlaceholder')) : t('chatNoQuestions')}
                      placeholderTextColor="rgba(255,255,255,0.25)"
                      multiline
                      maxLength={250}
                      editable={remaining > 0}
                      selectionColor="#FF6B00"
                      textAlignVertical="top"
                      underlineColorAndroid="transparent"
                      blurOnSubmit={false}
                      onSubmitEditing={function () { send(); }}
                    />
                    <TouchableOpacity
                      onPress={function () { send(); }}
                      disabled={loading || !msg.trim() || remaining <= 0}
                      activeOpacity={0.7}
                      style={[sd.sendBtn, (!msg.trim() || loading || remaining <= 0) && { opacity: 0.3 }]}
                    >
                      <LinearGradient colors={loading ? ['#333', '#444'] : ['#FF8C00', '#FF6D00']}
                        style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                      <Ionicons name={loading ? 'hourglass' : 'send'} size={17} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                  <Text style={sd.inputHint}>Press Enter or tap Send · {msg.length}/250</Text>
                </View>
              </KeyboardAvoidingView>

            </View>
          </View>
        </View>
      </DesktopScreenWrapper>
    );
  }

  // ── MOBILE LAYOUT ──────────────────────────────────────────────────

  // Oracle selection gateway — show when no mode chosen yet
  if (!selectedMode) {
    return (
      <DesktopScreenWrapper routeName="chat">
        <View style={{ flex: 1, backgroundColor: '#04030C' }}>
          <OracleSelection
            onSelect={function (m) {
              setMode(m);
              setSelectedMode(m);
              setMsgs([{ role: 'assistant', content: t('initialChat') }]);
            }}
            t={t}
          />
        </View>
      </DesktopScreenWrapper>
    );
  }

  // WhatsApp-style keyboard offset: account for header + status bar
  // Header = topPad + ~48px content + 8px paddingBottom
  var headerTotalHeight = topPad + 56;
  var kavOffset = Platform.OS === 'ios' ? headerTotalHeight : 0;
  var composerSafePad = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 6);
  var composerLift = kb.isOpen ? 0 : TAB_BAR_VISUAL_HEIGHT;

  return (
    <DesktopScreenWrapper routeName="chat">
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Fixed header — outside KAV so offset calculation is simpler */}
      <View style={[s.header, { paddingTop: topPad }]}>
        <TouchableOpacity
          onPress={function () { setSelectedMode(null); setMsgs([]); }}
          activeOpacity={0.7}
          style={s.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Back to oracle selection"
        >
          <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <View style={s.avatar}>
          <LinearGradient colors={gradients.orangeButton} style={StyleSheet.absoluteFill} />
          <Ionicons name={mode === 'dream' ? 'moon' : 'sparkles'} size={18} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { color: sc.sectionTitle }]}>{mode === 'dream' ? t('chatDreamTitle') : t('chatTitle')}</Text>
          <View style={s.statusRow}>
            <View style={[s.statusDot, { backgroundColor: loading ? '#FFB800' : '#34D399' }]} />
            <Text style={s.statusText}>{loading ? t('consultingCosmos') : t('askUniverse')}</Text>
          </View>
        </View>
        <View style={[s.birthBadge, { backgroundColor: birthDate ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.05)', borderColor: birthDate ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.1)' }]}>
          <Ionicons name={birthDate ? 'planet' : 'planet-outline'} size={13} color={birthDate ? '#34D399' : 'rgba(255,255,255,0.3)'} />
          <Text style={[s.birthBadgeText, { color: birthDate ? '#34D399' : 'rgba(255,255,255,0.3)' }]}>
            {birthDate ? t('chartLoaded') || 'Chart ✓' : t('noBirthData') || 'No chart'}
          </Text>
        </View>
      </View>

      {/* Limit card — always rendered but collapsed when keyboard open to avoid layout jump */}
      {!kb.isOpen && <LimitCard remaining={remaining} t={t} />}

      {/* KeyboardAvoidingView wraps messages + input */}
      <KeyboardAvoidingView
        style={{ flex: 1, minHeight: 0 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={kavOffset}
        enabled={Platform.OS === 'ios'}
      >
        <ScrollView
          ref={scroll}
          style={{ flex: 1 }}
          contentContainerStyle={[s.msgList, { paddingBottom: 4 }]}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          bounces={Platform.OS === 'ios'}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          automaticallyAdjustKeyboardInsets={false}
          maintainVisibleContentPosition={Platform.OS === 'ios' ? { minIndexForVisible: 0 } : undefined}
        >
          {msgs.map(function (m, i) { return <ChatBubble key={i} msg={m} />; })}
          {loading && (
            <Animated.View entering={FadeInUp.duration(200)} style={s.thinkRow}>
              <View style={s.aiDot}>
                <LinearGradient colors={['#FF8C00', '#FF6D00']} style={StyleSheet.absoluteFill} />
                <Text style={{ fontSize: 10 }}>{'\u2726'}</Text>
              </View>
              <View style={s.thinkBubble}><ThinkingDots /></View>
            </Animated.View>
          )}
          <View style={{ height: 8 }} />
        </ScrollView>

        {msgs.length <= 2 && !loading && remaining > 0 && !kb.isOpen && (
          <QuickChips onSelect={send} language={language} mode={mode} />
        )}

        {/* Input bar — sits directly above keyboard (WhatsApp style) */}
        <View style={[s.inputBar, { paddingBottom: composerSafePad, marginBottom: composerLift }]}>
          <LinearGradient
            colors={['rgba(255,107,0,0.06)', 'rgba(147,51,234,0.04)', 'transparent']}
            start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }}
            style={s.inputBarGlow}
          />
          <View style={s.inputRow}>
            <View style={s.inputFieldWrap}>
              <TextInput
                style={s.input}
                value={msg}
                onChangeText={setMsg}
                placeholder={remaining > 0 ? (mode === 'dream' ? t('chatDreamPlaceholder') : t('chatPlaceholder')) : t('chatNoQuestions')}
                placeholderTextColor="rgba(255,255,255,0.3)"
                multiline
                maxLength={250}
                editable={remaining > 0}
                selectionColor="#FF6B00"
                textAlignVertical="top"
                underlineColorAndroid="transparent"
                blurOnSubmit={false}
                onFocus={function () {
                  setTimeout(function () {
                    if (scroll.current) scroll.current.scrollToEnd({ animated: true });
                  }, 300);
                }}
              />
            </View>
            <SpringPressable
              onPress={function () { send(); }}
              disabled={loading || !msg.trim() || remaining <= 0}
              haptic="medium"
              scalePressed={0.88}
              style={[s.sendBtn, (!msg.trim() || loading || remaining <= 0) && { opacity: 0.3 }]}
            >
              <LinearGradient colors={loading ? ['#333', '#444'] : ['#FF8C00', '#FF6D00', '#E65100']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              <Ionicons name={loading ? 'hourglass' : 'arrow-up'} size={18} color="#FFF" />
            </SpringPressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
    </DesktopScreenWrapper>
  );
}

// STYLES
var s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingBottom: 8 },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,107,0,0.4)' },
  title: { fontSize: 18, fontWeight: '800', color: '#FFF1D0', letterSpacing: 0.3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: '500' },
  birthBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  birthBadgeText: { fontSize: 10, fontWeight: '700' },

  modeRow: { flexDirection: 'row', gap: 8, marginHorizontal: 18, marginBottom: 6 },
  modeBtn: { flex: 1 },
  modeBtnBg: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  modeBtnText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.35)' },

  limitCard: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 18, marginBottom: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,107,0,0.12)' },
  limitText: { fontSize: 11, color: '#FF8C33', fontWeight: '600', flex: 1 },
  limitDotsRow: { flexDirection: 'row', gap: 3 },
  limitDot: { width: 6, height: 6, borderRadius: 3 },
  dotUsed: { backgroundColor: 'rgba(255,255,255,0.1)' },
  dotFree: { backgroundColor: '#FF6B00' },

  msgList: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 10 },
  userWrap: { alignSelf: 'flex-end', maxWidth: '78%', marginBottom: 8 },
  userBubble: { borderRadius: 18, borderBottomRightRadius: 4, paddingHorizontal: 14, paddingVertical: 10 },
  userText: { fontSize: 14, lineHeight: 20, color: '#FFF1D0', fontWeight: '500' },
  aiWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, maxWidth: '85%', marginBottom: 8, alignSelf: 'flex-start' },
  aiDot: { width: 22, height: 22, borderRadius: 11, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginTop: 2, borderWidth: 1, borderColor: 'rgba(255,107,0,0.3)' },
  aiBubble: { flex: 1, borderRadius: 18, borderBottomLeftRadius: 4, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 13, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  aiText: { fontSize: 14, lineHeight: 21, color: 'rgba(255,255,255,0.88)' },
  thinkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, alignSelf: 'flex-start', marginBottom: 8 },
  thinkBubble: { borderRadius: 18, borderBottomLeftRadius: 4, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },

  chipsRow: { paddingHorizontal: 14, paddingVertical: 6, gap: 8, flexDirection: 'row' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1 },
  chipLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },

  inputBar: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,140,0,0.08)', backgroundColor: 'rgba(8,5,22,0.92)', overflow: 'hidden' },
  inputBarGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  inputFieldWrap: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 24, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 4 : 2, borderWidth: 1.5, borderColor: 'rgba(255,140,0,0.15)', ...boxShadow('rgba(255,107,0,0.15)', { width: 0, height: 0 }, 0.5, 8) },
  input: { flex: 1, minHeight: 38, maxHeight: 100, color: '#FFF1D0', fontSize: 15, paddingTop: 9, paddingBottom: 9, includeFontPadding: false, lineHeight: 21 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 1, ...boxShadow('#FF6B00', { width: 0, height: 2 }, 0.35, 8) },
});

// ── DESKTOP CHAT STYLES ──────────────────────────────────────────────
var sd = StyleSheet.create({
  // Outer shell: fills all space, centres the panel horizontally
  shell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  // The chat panel — max width 820, full height, glass card
  panel: {
    flex: 1,
    maxWidth: 820,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    ...boxShadow('#000', { width: 0, height: 8 }, 0.35, 32),
    flexDirection: 'column',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  panelHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  panelHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1, flexWrap: 'wrap', justifyContent: 'flex-end' },
  avatarLg: {
    width: 46, height: 46, borderRadius: 23,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  panelTitle: { fontSize: 16, fontWeight: '800', color: '#FFE8B0', letterSpacing: 0.3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusText: { fontSize: 11, color: 'rgba(255,255,255,0.42)', fontWeight: '500' },
  birthBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 10, borderWidth: 1,
  },
  birthBadgeText: { fontSize: 10.5, fontWeight: '700' },
  modeToggleRow: { flexDirection: 'row', gap: 6 },
  modeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  modeChipActive: { borderColor: 'transparent' },
  modeChipText: { fontSize: 11.5, fontWeight: '700', color: 'rgba(255,255,255,0.38)' },
  separator: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  limitBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 8,
    backgroundColor: 'rgba(255,107,0,0.03)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  limitText: { fontSize: 11, color: '#FF8C33', fontWeight: '600', flex: 1 },
  limitDots: { flexDirection: 'row', gap: 3 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  dotUsed: { backgroundColor: 'rgba(255,255,255,0.1)' },
  dotFree: { backgroundColor: '#FF6B00' },
  // Messages list padding
  msgList: { paddingHorizontal: 28, paddingTop: 20, paddingBottom: 12 },
  // Desktop bubble overrides — constrained to readable width
  userWrapD: { maxWidth: 580 },
  aiWrapD:   { maxWidth: 680 },
  aiBubbleD: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.08)' },
  // Thinking row
  thinkRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, alignSelf: 'flex-start', marginBottom: 8 },
  aiDotSm:   { width: 26, height: 26, borderRadius: 13, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,107,0,0.3)' },
  thinkBubble: { borderRadius: 18, borderBottomLeftRadius: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  // Input area
  inputArea: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(255,255,255,0.015)',
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,107,0,0.15)',
  },
  input: { flex: 1, minHeight: 40, maxHeight: 120, color: '#FFF1D0', fontSize: 14.5, paddingTop: 8, paddingBottom: 8 },
  sendBtn: {
    width: 38, height: 38, borderRadius: 12, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', marginBottom: 1, flexShrink: 0,
  },
  inputHint: {
    fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 6,
    textAlign: 'right', letterSpacing: 0.3,
  },
});
