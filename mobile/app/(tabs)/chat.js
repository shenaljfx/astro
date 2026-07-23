import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, StyleSheet, Dimensions,
  Image, LayoutAnimation, Keyboard, BackHandler,
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
import { useLocalSearchParams } from 'expo-router';
import DesktopScreenWrapper, { useDesktopCtx } from '../../components/DesktopScreenWrapper';
import SpringPressable from '../../components/effects/SpringPressable';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { boxShadow, textShadow } from '../../utils/shadow';
import useKeyboard from '../../hooks/useKeyboard';
import { setDockHidden } from '../../utils/dockVisibility';
import { useTheme } from '../../contexts/ThemeContext';
import { screenColors } from '../../constants/theme';
import useReducedMotion from '../../hooks/useReducedMotion';
import useLowEndDevice from '../../hooks/useLowEndDevice';
import { CosmicBackground } from '../../components/CosmicBackground';

import { TAB_BAR_VISUAL_HEIGHT } from './_layout';

var { width: SW, height: SH } = Dimensions.get('window');
// Fair-use daily cap (mirrors server default CHAT_FAIR_USE_DAILY). The server
// is the source of truth — this is the fallback + the base for the local cache.
var DAILY_LIMIT = 30;
// Only surface the counter when the subscriber is genuinely near the cap, so
// normal use feels unlimited. Below this many left → gentle heads-up.
var LOW_REMAINING = 5;
var STORAGE_KEY_PREFIX = '@grahachara_chat_usage_';

// -v2 filenames: the art was re-generated in place once and Metro/dev-client
// kept serving stale bitmaps/dimensions for the old asset module — new file
// names guarantee a fresh asset registration.
var ORACLE_COSMIC = require('../../assets/oracle/cosmic-guide-v2.png');
var ORACLE_DREAM = require('../../assets/oracle/dream-oracle-v2.png');

// ── Mode themes — the card chosen on the gateway follows the user into the
// room. Chat = the violet Cosmic Guide; Dream = the amber Dream Oracle.
// Both are the app's celestial accents (the old orange is gone).
var MODE_THEME = {
  chat: {
    accent: '#A78BFA',
    accentText: '#C4B5FD',
    bubbleGrad: ['#6D28D9', '#5B21B6', '#4C1D95'],
    bubbleText: '#F3EDFF',
    btnGrad: ['#8B5CF6', '#6D28D9'],
    chipBg: ['rgba(124,58,237,0.14)', 'rgba(167,139,250,0.06)'],
    chipBorder: 'rgba(167,139,250,0.28)',
    ring: 'rgba(167,139,250,0.5)',
    hairline: 'rgba(167,139,250,0.22)',
    glowSoft: ['rgba(124,58,237,0.08)', 'rgba(167,139,250,0.03)', 'transparent'],
    portrait: ORACLE_COSMIC,
    icon: 'sparkles',
    think: ['#A78BFA', '#C4B5FD', '#E8C56A'],
  },
  dream: {
    accent: '#E8C56A',
    accentText: '#FFD97A',
    bubbleGrad: ['#B45309', '#92400E', '#78350F'],
    bubbleText: '#FFF7E0',
    btnGrad: ['#E8C56A', '#C99A3C'],
    chipBg: ['rgba(232,197,106,0.12)', 'rgba(255,184,0,0.05)'],
    chipBorder: 'rgba(232,197,106,0.28)',
    ring: 'rgba(232,197,106,0.5)',
    hairline: 'rgba(232,197,106,0.22)',
    glowSoft: ['rgba(232,197,106,0.07)', 'rgba(255,184,0,0.03)', 'transparent'],
    portrait: ORACLE_DREAM,
    icon: 'moon',
    think: ['#E8C56A', '#FFD97A', '#A78BFA'],
  },
};

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

// Thinking Dots — three mode-accent particles breathing in sequence
// Each dot is its own component so hooks aren't called inside a loop (Rules of Hooks)
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

function ThinkingDots({ colors }) {
  var dots = colors || MODE_THEME.chat.think;
  return (
    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 14 }}>
      {dots.map(function (c, i) {
        return <ThinkDot key={i} color={c} index={i} />;
      })}
    </View>
  );
}

// The oracle's face \u2014 the art the user chose on the gateway, in miniature.
function OraclePortrait({ theme, size }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2, overflow: 'hidden',
      borderWidth: 1, borderColor: theme.hairline, backgroundColor: '#0A0618',
    }}>
      <Image source={theme.portrait} resizeMode="cover" style={{ width: '100%', height: '100%' }} fadeDuration={0} />
    </View>
  );
}

// Chat Bubble \u2014 the oracle speaks from its portrait; the user in the mode color
function ChatBubble({ msg, isDesktop, theme }) {
  var th = theme || MODE_THEME.chat;
  var isAi = msg.role === 'assistant';
  if (!isAi) {
    return (
      <Animated.View entering={FadeInUp.duration(250).springify()} style={[s.userWrap, isDesktop && sd.userWrapD]}>
        <LinearGradient colors={th.bubbleGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.userBubble}>
          <LinearGradient colors={['rgba(255,255,255,0.12)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', borderTopLeftRadius: 20, borderTopRightRadius: 20 }} />
          <Text style={[s.userText, { color: th.bubbleText }, isDesktop && { fontSize: 15 }]}>{msg.content}</Text>
        </LinearGradient>
      </Animated.View>
    );
  }
  return (
    <Animated.View entering={FadeInUp.duration(300).springify()} style={[s.aiWrap, isDesktop && sd.aiWrapD]}>
      <View style={{ marginTop: 2 }}><OraclePortrait theme={th} size={24} /></View>
      <View style={[s.aiBubble, { borderColor: th.hairline }, isDesktop && sd.aiBubbleD]}>
        <LinearGradient
          colors={th.glowSoft}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />
        <Text style={[s.aiText, isDesktop && { fontSize: 15, lineHeight: 23 }]}>{msg.content}</Text>
      </View>
    </Animated.View>
  );
}

// Limit Card
function LimitCard({ remaining, t, theme }) {
  var th = theme || MODE_THEME.chat;
  // Hide entirely during normal use — the plan is "unlimited"; only show a
  // gentle heads-up as the subscriber approaches the fair-use cap.
  if (remaining > LOW_REMAINING) return null;
  return (
    <Animated.View entering={FadeIn.duration(400)} style={[s.limitCard, { borderColor: th.hairline }]}>
      <LinearGradient
        colors={remaining > 0 ? th.chipBg : ['rgba(255,50,50,0.1)', 'rgba(255,50,50,0.03)']}
        style={StyleSheet.absoluteFill}
      />
      <Ionicons
        name={remaining > 0 ? 'chatbubble-ellipses-outline' : 'lock-closed-outline'}
        size={14}
        color={remaining > 0 ? th.accent : '#FF6B6B'}
      />
      <Text style={[s.limitText, { color: th.accentText }, remaining <= 0 && { color: '#FF6B6B' }]}>
        {remaining > 0 ? remaining + ' ' + t('chatQuestionsLeft') : t('chatNoQuestions')}
      </Text>
      <View style={s.limitDotsRow}>
        {Array.from({ length: LOW_REMAINING }).map(function (_, i) {
          return (
            <View key={i} style={[s.limitDot, i < (LOW_REMAINING - remaining) ? s.dotUsed : { backgroundColor: th.accent }]} />
          );
        })}
      </View>
    </Animated.View>
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
  var th = MODE_THEME[mode] || MODE_THEME.chat;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
      {chips.map(function (ch, i) {
        return (
          <SpringPressable key={i} onPress={function () { onSelect(ch.label); }} haptic="light" scalePressed={0.92}>
            <LinearGradient colors={th.chipBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.chip, { borderColor: th.chipBorder }]}>
              <Ionicons name={ch.icon} size={14} color={th.accent} />
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
      glow: '#A78BFA', icon: 'sparkles',
    },
    {
      key: 'dream', image: ORACLE_DREAM,
      title: t('chatModeDream'), desc: t('chatDreamDesc'),
      glow: '#FFB800', icon: 'moon',
    },
  ];

  // Explicit card geometry. The previous flex-stretch layout collapsed on
  // device into full-height image slivers; fixed 2:3 tarot proportions can't.
  var cardW = Math.min((Math.min(SW, 420) - 44) / 2, 186);
  var cardH = Math.round(cardW * 1.5);

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
        <View style={os.eyebrowRow}>
          <Ionicons name="sparkles" size={13} color="#E8C56A" />
          <Text style={os.eyebrow}>{t('chatOracleTitle') || 'Choose Your Oracle'}</Text>
          <Ionicons name="sparkles" size={13} color="#E8C56A" />
        </View>
        <Text style={os.subtitle}>{t('chatOracleSub')}</Text>
      </View>

      {/* Card pair — tarot gateway, art full-bleed with overlaid name */}
      <View style={os.cardsRow}>
        {cards.map(function (card) {
          return (
            <SpringPressable key={card.key} onPress={function () { onSelect(card.key); }} haptic="medium" scalePressed={0.95}>
              <View style={[os.card, { width: cardW, height: cardH }, boxShadow(card.glow, { width: 0, height: 12 }, 0.45, 26)]}>
                {/* Explicit size + style resizeMode: the resizeMode PROP on an
                    absolute-fill image renders at natural size under Fabric,
                    showing only the art's top slice. */}
                <Image
                  source={card.image}
                  style={{ position: 'absolute', top: 0, left: 0, width: cardW, height: cardH, resizeMode: 'cover' }}
                  fadeDuration={0}
                />

                {/* candlelight sheen + legibility scrim */}
                <LinearGradient
                  colors={['rgba(255,244,214,0.12)', 'transparent']}
                  style={os.sheen}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(6,3,20,0.45)', 'rgba(6,3,20,0.95)']}
                  locations={[0.42, 0.68, 1]}
                  style={StyleSheet.absoluteFillObject}
                />

                {/* mode sigil */}
                <View style={[os.sigil, { borderColor: card.glow + '66' }]}>
                  <Ionicons name={card.icon} size={13} color={card.glow} />
                </View>

                {/* name + whisper + enter */}
                <View style={os.cardText}>
                  <Text style={[os.cardTitle, { ...textShadow(card.glow + '80', { width: 0, height: 0 }, 16) }]}>{card.title}</Text>
                  <Text style={os.cardDesc} numberOfLines={2}>{card.desc}</Text>
                  <View style={[os.enterPill, { borderColor: card.glow + '50', backgroundColor: card.glow + '1F' }]}>
                    <Ionicons name="arrow-forward" size={12} color={card.glow} />
                  </View>
                </View>

                {/* double gold frame */}
                <View style={os.frameOuter} />
                <View style={os.frameInner} />
              </View>
            </SpringPressable>
          );
        })}
      </View>

      {/* Bottom hint */}
      <View style={os.hintWrap}>
        <Ionicons name="star-outline" size={10} color="rgba(255,255,255,0.22)" />
        <Text style={os.hintText}>
          {t('chatQuestionsLeft') ? DAILY_LIMIT + ' ' + t('chatQuestionsLeft') : 'Tap a card to begin'}
        </Text>
        <Ionicons name="star-outline" size={10} color="rgba(255,255,255,0.22)" />
      </View>
      </ScrollView>
    </View>
  );
}

var os = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  titleWrap: { alignItems: 'center', marginBottom: 32, paddingHorizontal: 24 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyebrow: {
    fontSize: 18, fontWeight: '900', color: '#E8D5B5',
    letterSpacing: 2, textAlign: 'center', textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.55)',
    marginTop: 10, textAlign: 'center', letterSpacing: 0.5, lineHeight: 18,
  },
  cardsRow: { flexDirection: 'row', gap: 12, justifyContent: 'center', paddingHorizontal: 16 },
  card: { borderRadius: 22, overflow: 'hidden', backgroundColor: '#0A0618' },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '18%' },
  sigil: {
    position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(8,4,22,0.55)', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  cardText: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    alignItems: 'center', paddingHorizontal: 12, paddingBottom: 14,
  },
  cardTitle: {
    fontSize: 16, fontWeight: '900', color: '#FFF6E3',
    letterSpacing: 0.6, textAlign: 'center',
  },
  // Sinhala combining marks clip with tight line heights — keep these loose.
  cardDesc: {
    fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.78)',
    marginTop: 5, textAlign: 'center', lineHeight: 17,
  },
  enterPill: {
    marginTop: 11, width: 32, height: 32, borderRadius: 16, borderWidth: 1.2,
    alignItems: 'center', justifyContent: 'center',
  },
  frameOuter: {
    ...StyleSheet.absoluteFillObject, borderRadius: 22, borderWidth: 1.5,
    borderColor: 'rgba(232,197,106,0.6)',
  },
  frameInner: {
    position: 'absolute', top: 5, left: 5, right: 5, bottom: 5, borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(232,197,106,0.35)',
  },
  hintWrap: { marginTop: 28, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  hintText: {
    fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.55)',
    letterSpacing: 2, textTransform: 'uppercase',
  },
});

// MAIN CHAT SCREEN
export default function ChatScreen() {
  var { t, language } = useLanguage();
  var { user, showPaywall } = useAuth();
  var { colors } = useTheme();
  var sc = screenColors(colors);
  var insets = useSafeAreaInsets();
  var isDesktop = useDesktopCtx();
  var [msg, setMsg] = useState('');
  var [msgs, setMsgs] = useState([]);
  var [loading, setLoading] = useState(false);
  var [remaining, setRemaining] = useState(DAILY_LIMIT);
  var [mode, setMode] = useState('chat');
  var [selectedMode, setSelectedMode] = useState(null);
  var [inputFocused, setInputFocused] = useState(false);
  var scroll = useRef(null);
  var reduced = useReducedMotion();
  var lowEnd = useLowEndDevice();
  // The chosen oracle's theme colors everything in the room.
  var theme = MODE_THEME[mode] || MODE_THEME.chat;

  // One LayoutAnimation per keyboard transition — the tab bar, chips, limit
  // card and composer margin all collapse/return in a single smooth pass
  // instead of four independent jumps. Configured in the listener so it lands
  // before the same-event re-renders commit.
  useEffect(function () {
    if (Platform.OS === 'web') return;
    var cfg = function () {
      LayoutAnimation.configureNext(LayoutAnimation.create(220, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
    };
    var subs = [
      Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', cfg),
      Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', cfg),
    ];
    return function () { subs.forEach(function (sub) { sub && sub.remove && sub.remove(); }); };
  }, []);

  // The room is full-bleed: the observatory dock steps aside while a
  // conversation is open and returns on the way out (or on unmount).
  useEffect(function () {
    setDockHidden(!!selectedMode && !isDesktop);
    return function () { setDockHidden(false); };
  }, [selectedMode, isDesktop]);

  // With the dock hidden, Android hardware back must exit the room —
  // mirrors the header back button exactly.
  useEffect(function () {
    if (Platform.OS === 'web' || !selectedMode) return;
    var sub = BackHandler.addEventListener('hardwareBackPress', function () {
      setSelectedMode(null);
      setMsgs([]);
      return true;
    });
    return function () { sub.remove(); };
  }, [selectedMode]);

  // Deep-link prefill: other screens (e.g. the kendara chart sections) can open
  // chat with ?prefill=... to pre-type a question. We only fill the box — the
  // user reviews and taps send — so nothing is asked on their behalf silently.
  var params = useLocalSearchParams();
  var prefillParam = params && params.prefill ? String(params.prefill) : '';
  useEffect(function () {
    if (prefillParam) setMsg(prefillParam);
  }, [prefillParam]);

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
          var used = (res.dailyLimit || DAILY_LIMIT) - res.remaining;
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

    var history = msgs.slice(1).map(function (m) { return { role: m.role, content: m.content }; });
    var ask = function () {
      return api.askAstrologer(finalContent, {
        language:    language,
        chatHistory: history,
        birthDate:   birthDate,
        birthLat:    birthLat,
        birthLng:    birthLng,
      });
    };
    var applyReply = function (res) {
      var reply = (res.data && (res.data.message || res.data.response)) || t('starsClouded');
      setMsgs(function (p) { return p.concat([{ role: 'assistant', content: reply }]); });
      if (typeof res.remaining === 'number') {
        setRemaining(res.remaining);
        var today = new Date().toISOString().slice(0, 10);
        var used = DAILY_LIMIT - res.remaining;
        AsyncStorage.setItem(usageKey(user?.uid), JSON.stringify({ date: today, count: used })).catch(function() {});
      }
    };
    var isSubError = function (e) {
      return !!(e && (e.statusCode === 402 || (e.message && /subscri/i.test(e.message))));
    };

    try {
      var res = await ask();
      applyReply(res);
      if (typeof res.remaining !== 'number') {
        var usage = await incrementUsage(user?.uid);
        setRemaining(Math.max(0, DAILY_LIMIT - usage.count));
      }
    } catch (e) {
      // ── Not subscribed: the highest-intent moment in the app. Hold the
      // question, open the paywall, and auto-ask after purchase. ──
      if (isSubError(e)) {
        setLoading(false);
        setMsgs(function (p) { return p.concat([{ role: 'assistant', content: t('chatHeldAnswer') }]); });
        try {
          await showPaywall('chat');
        } catch (payErr) {
          return; // cancelled — the held message stays as the re-entry point
        }
        setMsgs(function (p) { return p.concat([{ role: 'assistant', content: t('chatUnlocked') }]); });
        setLoading(true);
        // The store purchase reaches our server via webhook — allow it a few
        // seconds to land before giving up.
        var delays = [1500, 3000, 5000];
        try {
          for (var i = 0; i < delays.length; i++) {
            await new Promise(function (r) { setTimeout(r, delays[i]); });
            try {
              var retryRes = await ask();
              applyReply(retryRes);
              return;
            } catch (retryErr) {
              if (!isSubError(retryErr)) throw retryErr;
            }
          }
          setMsgs(function (p) { return p.concat([{ role: 'assistant', content: t('chatUnlockDelay') }]); });
        } catch (postErr) {
          setMsgs(function (p) { return p.concat([{ role: 'assistant', content: t('starsClouded') }]); });
        } finally {
          setLoading(false);
        }
        return;
      }
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
  }, [msg, language, t, loading, remaining, mode, msgs, birthDate, birthLat, birthLng, user, showPaywall]);

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
                  <View style={[sd.avatarLg, { borderColor: theme.ring }]}>
                    <Image source={theme.portrait} resizeMode="cover" style={{ width: '100%', height: '100%' }} fadeDuration={0} />
                  </View>
                  <View>
                    <Text style={sd.panelTitle}>{mode === 'dream' ? t('chatDreamTitle') : t('chatTitle')}</Text>
                    <View style={sd.statusRow}>
                      <View style={[sd.statusDot, { backgroundColor: loading ? theme.accent : '#34D399' }]} />
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
                        colors={mode === 'chat' ? MODE_THEME.chat.btnGrad : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.06)']}
                        style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      />
                      <Ionicons name="chatbubble-ellipses" size={13} color={mode === 'chat' ? '#FFF' : 'rgba(255,255,255,0.4)'} />
                      <Text style={[sd.modeChipText, mode === 'chat' && { color: '#F3EDFF' }]}>{t('chatModeChat')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={function () { setMode('dream'); }} activeOpacity={0.7}
                      style={[sd.modeChip, mode === 'dream' && sd.modeChipActive]}>
                      <LinearGradient
                        colors={mode === 'dream' ? MODE_THEME.dream.btnGrad : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.06)']}
                        style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      />
                      <Ionicons name="moon" size={13} color={mode === 'dream' ? '#2A1707' : 'rgba(255,255,255,0.4)'} />
                      <Text style={[sd.modeChipText, mode === 'dream' && { color: '#2A1707' }]}>{t('chatModeDream')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* ── Separator ── */}
              <View style={sd.separator} />

              {/* ── Fair-use bar — only near the cap, so normal use feels unlimited ── */}
              {remaining <= LOW_REMAINING ? (
                <View style={sd.limitBar}>
                  <Ionicons
                    name={remaining > 0 ? 'chatbubble-ellipses-outline' : 'lock-closed-outline'}
                    size={13} color={remaining > 0 ? theme.accent : '#FF6B6B'}
                  />
                  <Text style={[sd.limitText, { color: theme.accentText }, remaining <= 0 && { color: '#FF6B6B' }]}>
                    {remaining > 0 ? remaining + ' ' + t('chatQuestionsLeft') : t('chatNoQuestions')}
                  </Text>
                  <View style={sd.limitDots}>
                    {Array.from({ length: LOW_REMAINING }).map(function (_, i) {
                      return <View key={i} style={[sd.dot, i < (LOW_REMAINING - remaining) ? sd.dotUsed : { backgroundColor: theme.accent }]} />;
                    })}
                  </View>
                </View>
              ) : null}

              {/* ── Messages + chips + input ── */}
              <KeyboardAvoidingView
                style={{ flex: 1, minHeight: 0 }}
                behavior="padding"
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
                  {msgs.map(function (m, i) { return <ChatBubble key={i} msg={m} isDesktop theme={theme} />; })}
                  {loading && (
                    <Animated.View entering={FadeInUp.duration(200)} style={sd.thinkRow}>
                      <OraclePortrait theme={theme} size={26} />
                      <View style={sd.thinkBubble}><ThinkingDots colors={theme.think} /></View>
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
                      selectionColor={theme.accent}
                      textAlignVertical="top"
                      underlineColorAndroid="transparent"
                      onKeyPress={Platform.OS === 'web' ? function (e) {
                        // Enter sends; Shift+Enter makes a newline (multiline
                        // inputs never fire onSubmitEditing on web).
                        var ne = e && e.nativeEvent;
                        if (ne && ne.key === 'Enter' && !ne.shiftKey) {
                          if (e.preventDefault) e.preventDefault();
                          send();
                        }
                      } : undefined}
                    />
                    <TouchableOpacity
                      onPress={function () { send(); }}
                      disabled={loading || !msg.trim() || remaining <= 0}
                      activeOpacity={0.7}
                      style={[sd.sendBtn, (!msg.trim() || loading || remaining <= 0) && { opacity: 0.3 }]}
                    >
                      <LinearGradient colors={loading ? ['#333', '#444'] : theme.btnGrad}
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

  // Composer geometry: the dock steps aside for the whole room (full-bleed),
  // so the composer only needs the safe-area pad at the bottom.
  var composerSafePad = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 6);

  return (
    <DesktopScreenWrapper routeName="chat">
    <View style={{ flex: 1, backgroundColor: '#04030C' }}>
      {/* the oracle's chamber — the same living night as the gateway */}
      <CosmicBackground reduced={reduced} lowEnd={lowEnd} />

      {/* ONE KeyboardAvoidingView wraps the whole screen (header included):
          iOS 'padding' with zero offset — nothing to guess, the header stays
          put while the list shrinks. Android is disabled — the OS-level pan
          (softwareKeyboardLayoutMode) does its one job alone, exactly like
          every other screen in this app. No double-compensation. */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}
      >
      {/* header — the chosen oracle presides over the room */}
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
        <OraclePortrait theme={theme} size={40} />
        {/* minWidth:0 lets the title/status shrink and truncate instead of
            forcing the badge off-screen. Long Sinhala names (e.g.
            'විශ්ව මාර්ගෝපදේශී') otherwise wrapped to two cramped lines. */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={[s.title, { color: sc.sectionTitle }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >{mode === 'dream' ? t('chatDreamTitle') : t('chatTitle')}</Text>
          <View style={s.statusRow}>
            <View style={[s.statusDot, { backgroundColor: loading ? theme.accent : '#34D399' }]} />
            <Text style={s.statusText} numberOfLines={1}>{loading ? t('consultingCosmos') : t('askUniverse')}</Text>
          </View>
        </View>
        <View style={[s.birthBadge, { backgroundColor: birthDate ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.05)', borderColor: birthDate ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.1)' }]}>
          <Ionicons name={birthDate ? 'planet' : 'planet-outline'} size={13} color={birthDate ? '#34D399' : 'rgba(255,255,255,0.3)'} />
          <Text style={[s.birthBadgeText, { color: birthDate ? '#34D399' : 'rgba(255,255,255,0.3)' }]} numberOfLines={1}>
            {birthDate ? t('chartLoaded') || 'Chart ✓' : t('noBirthData') || 'No chart'}
          </Text>
        </View>
      </View>

      <LinearGradient
        colors={['transparent', theme.hairline, 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={s.headerHairline}
      />

      {/* Fair-use heads-up — collapses with the keyboard (animated by the
          LayoutAnimation configured in the keyboard listeners) */}
      {!kb.isOpen && <LimitCard remaining={remaining} t={t} theme={theme} />}
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
        >
          {msgs.map(function (m, i) { return <ChatBubble key={i} msg={m} theme={theme} />; })}
          {loading && (
            <Animated.View entering={FadeInUp.duration(200)} style={s.thinkRow}>
              <View style={{ marginTop: 2 }}><OraclePortrait theme={theme} size={24} /></View>
              <View style={[s.thinkBubble, { borderColor: theme.hairline }]}><ThinkingDots colors={theme.think} /></View>
            </Animated.View>
          )}
          <View style={{ height: 8 }} />
        </ScrollView>

        {msgs.length <= 2 && !loading && remaining > 0 && !kb.isOpen && (
          <QuickChips onSelect={send} language={language} mode={mode} />
        )}

        {/* Composer — glass capsule with a live focus ring, directly above
            the keyboard (WhatsApp placement) */}
        <View style={[s.inputBar, { paddingBottom: composerSafePad }]}>
          <LinearGradient
            colors={['transparent', theme.hairline, 'transparent']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={s.inputBarGlow}
          />
          {msg.length >= 200 ? (
            <Text style={[s.charCount, msg.length >= 240 && { color: '#FCA5A5' }]}>{msg.length + '/250'}</Text>
          ) : null}
          <View style={s.inputRow}>
            <View style={[s.inputFieldWrap, inputFocused && { borderColor: theme.ring }]}>
              <TextInput
                style={s.input}
                value={msg}
                onChangeText={setMsg}
                placeholder={remaining > 0 ? (mode === 'dream' ? t('chatDreamPlaceholder') : t('chatPlaceholder')) : t('chatNoQuestions')}
                placeholderTextColor="rgba(255,255,255,0.3)"
                multiline
                maxLength={250}
                editable={remaining > 0}
                selectionColor={theme.accent}
                textAlignVertical="top"
                underlineColorAndroid="transparent"
                onFocus={function () { setInputFocused(true); }}
                onBlur={function () { setInputFocused(false); }}
              />
            </View>
            <SpringPressable
              onPress={function () { send(); }}
              disabled={loading || !msg.trim() || remaining <= 0}
              haptic="medium"
              scalePressed={0.88}
              style={[s.sendBtn, (!msg.trim() || loading || remaining <= 0) && { opacity: 0.3 }]}
            >
              <LinearGradient colors={loading ? ['#333', '#444'] : theme.btnGrad} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 8 },
  headerHairline: { height: 1, marginBottom: 2 },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title: { fontSize: 18, fontWeight: '800', color: '#FFF1D0', letterSpacing: 0.3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  statusText: { flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.62)', fontWeight: '500' },
  birthBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, borderWidth: 1, flexShrink: 0 },
  birthBadgeText: { fontSize: 10, fontWeight: '700' },

  limitCard: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 18, marginBottom: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  limitText: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600', flex: 1 },
  limitDotsRow: { flexDirection: 'row', gap: 3 },
  limitDot: { width: 6, height: 6, borderRadius: 3 },
  dotUsed: { backgroundColor: 'rgba(255,255,255,0.1)' },

  msgList: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 10 },
  userWrap: { alignSelf: 'flex-end', maxWidth: '78%', marginBottom: 8 },
  userBubble: { borderRadius: 18, borderBottomRightRadius: 4, paddingHorizontal: 14, paddingVertical: 10 },
  userText: { fontSize: 14, lineHeight: 20, color: '#FFF1D0', fontWeight: '500' },
  aiWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, maxWidth: '85%', marginBottom: 8, alignSelf: 'flex-start' },
  aiBubble: { flex: 1, borderRadius: 18, borderBottomLeftRadius: 4, backgroundColor: 'rgba(10,8,24,0.55)', paddingHorizontal: 13, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  aiText: { fontSize: 14, lineHeight: 21, color: 'rgba(255,255,255,0.88)' },
  thinkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, alignSelf: 'flex-start', marginBottom: 8 },
  thinkBubble: { borderRadius: 18, borderBottomLeftRadius: 4, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },

  chipsRow: { paddingHorizontal: 14, paddingVertical: 6, gap: 8, flexDirection: 'row' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1 },
  chipLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },

  inputBar: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, borderTopWidth: 0, backgroundColor: 'rgba(8,5,22,0.92)', overflow: 'hidden' },
  inputBarGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5 },
  charCount: { alignSelf: 'flex-end', fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.62)', marginBottom: 4, fontVariant: ['tabular-nums'] },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  inputFieldWrap: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 24, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 4 : 2, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.10)' },
  // NOTE: no `includeFontPadding:false` and no tight `lineHeight` here — both
  // clip the tops of Sinhala combining marks (ැ ි ්‍ය …) on Android. Let the
  // platform reserve ascender/descender space, exactly like every other input.
  input: { flex: 1, minHeight: 40, maxHeight: 100, color: '#FFF1D0', fontSize: 15, paddingTop: 9, paddingBottom: 9 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 1, ...boxShadow('#000', { width: 0, height: 2 }, 0.3, 8) },
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
  statusText: { fontSize: 11, color: 'rgba(255,255,255,0.62)', fontWeight: '500' },
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
  modeChipText: { fontSize: 11.5, fontWeight: '700', color: 'rgba(255,255,255,0.62)' },
  separator: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  limitBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 8,
    backgroundColor: 'rgba(255,107,0,0.03)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  limitText: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600', flex: 1 },
  limitDots: { flexDirection: 'row', gap: 3 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  dotUsed: { backgroundColor: 'rgba(255,255,255,0.1)' },
  // Messages list padding
  msgList: { paddingHorizontal: 28, paddingTop: 20, paddingBottom: 12 },
  // Desktop bubble overrides — constrained to readable width
  userWrapD: { maxWidth: 580 },
  aiWrapD:   { maxWidth: 680 },
  aiBubbleD: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.08)' },
  // Thinking row
  thinkRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, alignSelf: 'flex-start', marginBottom: 8 },
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
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
  },
  input: { flex: 1, minHeight: 40, maxHeight: 120, color: '#FFF1D0', fontSize: 14.5, paddingTop: 8, paddingBottom: 8 },
  sendBtn: {
    width: 38, height: 38, borderRadius: 12, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', marginBottom: 1, flexShrink: 0,
  },
  inputHint: {
    fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 6,
    textAlign: 'right', letterSpacing: 0.3,
  },
});
