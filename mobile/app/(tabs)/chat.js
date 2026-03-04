import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import CosmicBackground from '../../components/CosmicBackground';
import { useLanguage } from '../../contexts/LanguageContext';
import api from '../../services/api';

function AuraBox({ children, style }) {
  return (
    <View style={[gs.box, style]}>
      <LinearGradient
        colors={['rgba(80, 20, 150, 0.3)', 'rgba(30, 10, 80, 0.4)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />
      <View style={gs.innerGlow} />
      {children}
    </View>
  );
}
var gs = StyleSheet.create({
  box: {
    borderRadius: 24, overflow: 'hidden', borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.15)', padding: 16,
    shadowColor: '#a855f7', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 5,
  },
  innerGlow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 24,
  }
});

function ChatBubble({ msg }) {
  var isAi = msg.role === 'assistant';
  return (
    <Animated.View entering={FadeInRight.duration(400)} style={[s.msgWrapper, isAi ? s.msgAi : s.msgUser]}>
      {isAi && (
        <View style={s.aiIconBox}>
          <LinearGradient colors={['#a855f7', '#6366f1']} style={StyleSheet.absoluteFill} />
          <Ionicons name="sparkles" size={14} color="#fff" />
        </View>
      )}
      <View style={[s.bubble, isAi ? s.bubbleAi : s.bubbleUser]}>
        {isAi && <View style={s.glowWrapper}><LinearGradient colors={['rgba(168, 85, 247, 0.1)', 'transparent']} style={StyleSheet.absoluteFill} /></View>}
        <Text style={[s.msgText, dictStyle(isAi)]}>{msg.content}</Text>
      </View>
    </Animated.View>
  );
}

function dictStyle(isAi) {
  return { color: isAi ? '#f3e8ff' : '#fff' };
}

export default function ChatScreen() {
  var { t, language } = useLanguage();
  var [msg, setMsg] = useState('');
  var [msgs, setMsgs] = useState([
    { role: 'assistant', content: t('initialChat') }
  ]);
  var [loading, setLoading] = useState(false);
  var scroll = useRef(null);

  useEffect(() => {
    // Re-initialize greeting when language changes, usually you might want to keep history though
    // For now, let's just make sure the greeting if it's the only message is updated
    setMsgs(prev => {
        if (prev.length === 1 && prev[0].role === 'assistant') {
            return [{ role: 'assistant', content: t('initialChat') }];
        }
        return prev;
    });
  }, [language, t]);

  var send = async function() {
    if (!msg.trim()) return;
    var uMsg = { role: 'user', content: msg };
    setMsgs((p) => [...p, uMsg]);
    setMsg('');
    setLoading(true);
    
    try {
      var res = await api.askAstrologer(uMsg.content, { language });
      setMsgs((p) => [...p, { role: 'assistant', content: res.data.response || t('starsClouded') }]);
    } catch (e) {
      setMsgs((p) => [...p, { role: 'assistant', content: t('cosmosConnectionFailed') }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scroll.current?.scrollToEnd({ animated: true });
  }, [msgs, loading]);

  var keyboardOffset = Platform.OS === 'ios' ? 90 : 20;

  return (
    <CosmicBackground>
      <View style={s.header}>
        <Text style={s.title}>{t('chatTitle')}</Text>
        <Text style={s.subtitle}>{t('askUniverse')}</Text>
      </View>

      <KeyboardAvoidingView 
        style={s.flex} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={keyboardOffset}
      >
        <ScrollView 
          ref={scroll}
          style={s.flex} 
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
        >
          {msgs.map((m, i) => <ChatBubble key={i} msg={m} />)}
          {loading && (
            <Animated.View entering={FadeInUp.duration(400)} style={s.typingBox}>
              <ActivityIndicator color="#a855f7" />
              <Text style={s.typingText}>{t('consultingCosmos')}</Text>
            </Animated.View>
          )}
          <View style={{ height: 20 }} />
        </ScrollView>

        <AuraBox style={s.inputContainer}>
          <TextInput
            style={s.input}
            value={msg}
            onChangeText={setMsg}
            placeholder={t('chatPlaceholder')}
            placeholderTextColor="rgba(255,255,255,0.4)"
            multiline
            maxLength={300}
          />
          <TouchableOpacity onPress={send} disabled={loading || !msg.trim()} style={[s.sendBtn, (!msg.trim() || loading) && { opacity: 0.5 }]}>
            <LinearGradient colors={['#a855f7', '#6366f1']} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:1}} />
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </AuraBox>
      </KeyboardAvoidingView>
    </CosmicBackground>
  );
}

var s = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingTop: Platform.OS === 'ios' ? 70 : 50, paddingHorizontal: 20, paddingBottom: 10 },
  title: { fontSize: 32, fontWeight: '800', color: '#fff', textShadowColor: 'rgba(168,85,247,0.5)', textShadowOffset:{width:0,height:2}, textShadowRadius: 8 },
  subtitle: { fontSize: 15, color: '#d8b4fe', fontWeight: '500', marginTop: 4, letterSpacing: 0.5 },
  content: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20 },
  msgWrapper: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end', maxWidth: '85%' },
  msgUser: { alignSelf: 'flex-end' },
  msgAi: { alignSelf: 'flex-start' },
  aiIconBox: { width: 28, height: 28, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginRight: 8, marginBottom: 4 },
  bubble: { padding: 14, overflow: 'hidden' },
  glowWrapper: { ...StyleSheet.absoluteFillObject },
  bubbleUser: { backgroundColor: 'rgba(168, 85, 247, 0.4)', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 4, borderWidth: 1, borderColor: 'rgba(216, 180, 254, 0.2)' },
  bubbleAi: { backgroundColor: 'rgba(30, 20, 50, 0.6)', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomRightRadius: 20, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.2)' },
  msgText: { fontSize: 15, lineHeight: 22, color: '#fff' },
  typingBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(30,20,50,0.4)', alignSelf: 'flex-start', padding: 12, borderRadius: 20, gap: 10, borderWidth: 1, borderColor: 'rgba(168,85,247,0.1)' },
  typingText: { color: '#a855f7', fontSize: 13, fontWeight: '600' },
  inputContainer: { borderRadius: 30, padding: 6, marginHorizontal: 16, marginBottom: Platform.OS === 'ios' ? 0 : 16, flexDirection: 'row', alignItems: 'flex-end', backgroundColor: 'rgba(20,10,40,0.8)' },
  input: { flex: 1, minHeight: 44, maxHeight: 100, color: '#fff', fontSize: 15, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
});