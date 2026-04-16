import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, StyleSheet, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  FadeInUp, FadeIn,
  useSharedValue, useAnimatedStyle, withRepeat,
  withSequence, withTiming, interpolate,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DesktopScreenWrapper, { useDesktopCtx } from '../../components/DesktopScreenWrapper';
import SpringPressable from '../../components/effects/SpringPressable';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { boxShadow, textShadow } from '../../utils/shadow';
import TabBackground from '../../components/TabBackground';

var { width: SW } = Dimensions.get('window');
var DAILY_LIMIT = 5;
var STORAGE_KEY_PREFIX = '@grahachara_chat_usage_';

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
function ThinkingDots() {
  var COLORS = ['#FF8C00', '#FF6D00', '#FFB800', '#E65100', '#34D399'];
  var dots = [];
  for (var _i = 0; _i < 5; _i++) { dots.push(useSharedValue(0)); }
  var orbit = useSharedValue(0);
  useEffect(function () {
    for (var di = 0; di < 5; di++) {
      (function (idx) {
        setTimeout(function () {
          dots[idx].value = withRepeat(withSequence(withTiming(1, { duration: 600 }), withTiming(0, { duration: 600 })), -1);
        }, idx * 120);
      })(di);
    }
    orbit.value = withRepeat(withTiming(1, { duration: 2000 }), -1);
  }, []);
  var anims = dots.map(function (d, i) {
    return useAnimatedStyle(function () {
      return {
        opacity: interpolate(d.value, [0, 1], [0.2, 1]),
        transform: [
          { translateY: interpolate(d.value, [0, 1], [0, -3]) },
          { scale: interpolate(d.value, [0, 1], [0.7, 1.2]) },
        ],
      };
    });
  });
  return (
    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 14 }}>
      {COLORS.map(function (c, i) {
        return <Animated.View key={i} style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: c, ...boxShadow(c, { width: 0, height: 0 }, 0.8, 4) }, anims[i]]} />;
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
        { icon: 'sunny-outline', label: 'අද දවස කොහොමද?' },
        { icon: 'heart-outline', label: 'මට ආදරේ හරි යයිද?' },
        { icon: 'time-outline', label: 'රාහු කාලෙ කීයද?' },
        { icon: 'color-palette-outline', label: 'මට හරියන පාට?' },
        { icon: 'briefcase-outline', label: 'රස්සාවක් සෙට් වෙයිද?' },
        { icon: 'airplane-outline', label: 'රට යන්න පුළුවන්ද?' },
      ]
    : [
        { icon: 'sunny-outline', label: "Today's Nakath?" },
        { icon: 'heart-outline', label: 'Love Forecast?' },
        { icon: 'time-outline', label: 'Rahu Period?' },
        { icon: 'color-palette-outline', label: 'Lucky Color?' },
        { icon: 'briefcase-outline', label: 'Career Luck?' },
        { icon: 'airplane-outline', label: 'Travel Stars?' },
      ];

  var dreamChips = language === 'si'
    ? [
        { icon: 'water-outline', label: 'වතුරට වැටෙනවා' },
        { icon: 'flash-outline', label: 'සතෙක් පස්සෙන් එනවා' },
        { icon: 'skull-outline', label: 'දතක් ගැලවෙනවා' },
        { icon: 'home-outline', label: 'පරණ ගෙදර දැක්කා' },
        { icon: 'paw-outline', label: 'මියගිය අය දැක්කා' },
        { icon: 'cloudy-night-outline', label: 'පියාඹනවා දැක්කා' },
      ]
    : [
        { icon: 'water-outline', label: 'Falling into water' },
        { icon: 'flash-outline', label: 'Being chased' },
        { icon: 'skull-outline', label: 'Dreaming of death' },
        { icon: 'home-outline', label: 'Old house dream' },
        { icon: 'paw-outline', label: 'Animals in dream' },
        { icon: 'cloudy-night-outline', label: 'Recurring dream' },
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

// MAIN CHAT SCREEN
export default function ChatScreen() {
  var { t, language } = useLanguage();
  var { user } = useAuth();
  var insets = useSafeAreaInsets();
  var isDesktop = useDesktopCtx();
  var [msg, setMsg] = useState('');
  var [msgs, setMsgs] = useState([]);
  var [loading, setLoading] = useState(false);
  var [remaining, setRemaining] = useState(DAILY_LIMIT);
  var [mode, setMode] = useState('chat');
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
      setMsgs(function (p) { return p.concat([{ role: 'assistant', content: t('cosmosConnectionFailed') }]); });
    } finally {
      setLoading(false);
    }
  }, [msg, language, t, loading, remaining, mode, msgs, birthDate, birthLat, birthLng]);

  useEffect(function () {
    setTimeout(function () { if (scroll.current) scroll.current.scrollToEnd({ animated: true }); }, 120);
  }, [msgs, loading]);

  var topPad = isDesktop ? 0 : Math.max(insets.top, 10) + 6;
  var bottomPad = isDesktop ? 0 : Math.max(insets.bottom, 6) + 8;

  // ── DESKTOP LAYOUT ────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <DesktopScreenWrapper routeName="chat">
        <View style={{ flex: 1, backgroundColor: '#0C0602' }}>
          <TabBackground tabName="chat" />
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
              <KeyboardAvoidingView style={{ flex: 1, minHeight: 0 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={sd.msgList}
                  showsVerticalScrollIndicator={false} overScrollMode="never" bounces={false}>
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
  return (
    <DesktopScreenWrapper routeName="chat">
    <View style={{ flex: 1, backgroundColor: '#0C0602' }}>
      <TabBackground tabName="chat" />
      <View style={[s.header, { paddingTop: topPad }]}>
        <View style={s.avatar}>
          <LinearGradient colors={mode === 'dream' ? ['#FF8C00', '#E65100'] : ['#FF8C00', '#FF6D00']} style={StyleSheet.absoluteFill} />
          <Ionicons name={mode === 'dream' ? 'moon' : 'sparkles'} size={18} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{mode === 'dream' ? t('chatDreamTitle') : t('chatTitle')}</Text>
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

      <ModeToggle mode={mode} setMode={setMode} t={t} />
      <LimitCard remaining={remaining} t={t} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}>
        <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={s.msgList} showsVerticalScrollIndicator={false} overScrollMode="never" bounces={false}>
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
          <View style={{ height: 20 }} />
        </ScrollView>

        {msgs.length <= 2 && !loading && remaining > 0 && <QuickChips onSelect={send} language={language} mode={mode} />}

        <View style={[s.inputBar, { paddingBottom: bottomPad }]}>
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              value={msg}
              onChangeText={setMsg}
              placeholder={remaining > 0 ? (mode === 'dream' ? t('chatDreamPlaceholder') : t('chatPlaceholder')) : t('chatNoQuestions')}
              placeholderTextColor="rgba(255,255,255,0.25)"
              multiline
              maxLength={250}
              editable={remaining > 0}
              selectionColor="#FF6B00"
            />
            <SpringPressable
              onPress={function () { send(); }}
              disabled={loading || !msg.trim() || remaining <= 0}
              haptic="medium"
              scalePressed={0.88}
              style={[s.sendBtn, (!msg.trim() || loading || remaining <= 0) && { opacity: 0.3 }]}
            >
              <LinearGradient colors={loading ? ['#333', '#444'] : ['#FF8C00', '#FF6D00']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              <Ionicons name={loading ? 'hourglass' : 'send'} size={16} color="#FFF" />
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

  inputBar: { paddingHorizontal: 14, paddingTop: 6, paddingBottom: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 22, paddingHorizontal: 14, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,107,0,0.12)' },
  input: { flex: 1, minHeight: 36, maxHeight: 90, color: '#FFF1D0', fontSize: 14, paddingTop: 8, paddingBottom: 8 },
  sendBtn: { width: 34, height: 34, borderRadius: 17, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 1 },
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
