import React from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import CosmicBackground from '../../components/CosmicBackground';
import { useLanguage } from '../../contexts/LanguageContext';

function AuraBox({ children, style }) {
  return (
    <View style={[gs.box, style]}>
      <LinearGradient
        colors={['rgba(20, 80, 150, 0.3)', 'rgba(10, 30, 80, 0.4)']}
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
    borderColor: 'rgba(56, 189, 248, 0.15)', padding: 20, marginBottom: 16,
    shadowColor: '#38bdf8', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 5,
  },
  innerGlow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 24,
  }
});

function SettingItem({ icon, title, value, type = 'nav' }) {
  return (
    <View style={s.settingRow}>
      <View style={s.settingIconWrapper}>
        <LinearGradient colors={['rgba(56, 189, 248, 0.2)', 'transparent']} style={StyleSheet.absoluteFill} />
        <Ionicons name={icon} size={20} color="#7dd3fc" />
      </View>
      <View style={s.settingLeft}>
        <Text style={s.settingTitle}>{title}</Text>
      </View>
      {type === 'nav' ? (
        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
      ) : (
        <Switch
          value={value}
          onValueChange={() => {}}
          trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(56, 189, 248, 0.5)' }}
          thumbColor={value ? '#38bdf8' : '#cbd5e1'}
        />
      )}
    </View>
  );
}

export default function ProfileScreen() {
  var { language, switchLanguage, t } = useLanguage();

  return (
    <CosmicBackground>
      <ScrollView style={s.flex} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(100).duration(800)}>
          <Text style={s.title}>{t('tabProfile')}</Text>
          <Text style={s.subtitle}>{t('manageIdentity')}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(800)}>
          <View style={s.avatarContainer}>
            <LinearGradient colors={['#38bdf8', '#818cf8']} style={s.avatarOuterRing} />
            <View style={s.avatarInner}>
              <Ionicons name="person" size={40} color="#bae6fd" />
            </View>
            <View style={s.editBadge}>
              <Ionicons name="pencil" size={14} color="#fff" />
            </View>
          </View>
          <Text style={s.userName}>{t('seeker')}</Text>
          <Text style={s.userConstellation}>{t('moonInVrishabha')}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(800)}>
          <AuraBox>
            <Text style={s.sectionTitle}>{t('language')}</Text>
            <View style={s.langContainer}>
              <TouchableOpacity
                style={[s.langBtn, language === 'en' && s.langBtnActive]}
                onPress={() => switchLanguage('en')}
              >
                {language === 'en' && <LinearGradient colors={['#38bdf8', '#818cf8']} style={StyleSheet.absoluteFill} />}
                <Text style={[s.langText, language === 'en' && s.langTextActive]}>English</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.langBtn, language === 'si' && s.langBtnActive]}
                onPress={() => switchLanguage('si')}
              >
                {language === 'si' && <LinearGradient colors={['#38bdf8', '#818cf8']} style={StyleSheet.absoluteFill} />}
                <Text style={[s.langText, language === 'si' && s.langTextActive]}>සිංහල</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.langBtn, language === 'ta' && s.langBtnActive]}
                onPress={() => switchLanguage('ta')}
              >
                {language === 'ta' && <LinearGradient colors={['#38bdf8', '#818cf8']} style={StyleSheet.absoluteFill} />}
                <Text style={[s.langText, language === 'ta' && s.langTextActive]}>தமிழ்</Text>
              </TouchableOpacity>
            </View>
          </AuraBox>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(800)}>
          <AuraBox>
            <Text style={s.sectionTitle}>{t('notifications')}</Text>
            <SettingItem icon="notifications" title={t('dailyCelestialPush')} type="switch" value={true} />
            <SettingItem icon="moon" title={t('rahuKalayaAlerts')} type="switch" value={true} />
            <SettingItem icon="location" title={t('syncHoroscopeLocation')} type="switch" value={false} />
          </AuraBox>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(500).duration(800)}>
          <AuraBox>
            <Text style={s.sectionTitle}>{t('about')}</Text>
            <SettingItem icon="star" title={t('rateCosmicAlignment')} />
            <SettingItem icon="document-text" title={t('sacredScrolls')} />
            <SettingItem icon="shield-checkmark" title={t('privacyPolicy')} />
          </AuraBox>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </CosmicBackground>
  );
}

var s = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 70 : 50 },
  title: { fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 4, textShadowColor: 'rgba(56,189,248,0.5)', textShadowOffset:{width:0,height:2}, textShadowRadius: 8 },
  subtitle: { fontSize: 16, color: '#7dd3fc', marginBottom: 30, letterSpacing: 0.5 },
  avatarContainer: { alignSelf: 'center', width: 100, height: 100, marginBottom: 16 },
  avatarOuterRing: { ...StyleSheet.absoluteFillObject, borderRadius: 50, opacity: 0.8 },
  avatarInner: { flex: 1, margin: 3, backgroundColor: '#0f172a', borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#38bdf8', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#0f172a' },
  userName: { fontSize: 24, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 4 },
  userConstellation: { fontSize: 14, color: '#7dd3fc', textAlign: 'center', marginBottom: 24, fontWeight: '500' },
  sectionTitle: { fontSize: 14, color: 'rgba(125, 211, 252, 0.7)', fontWeight: '700', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1.5 },
  langContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: 4 },
  langBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12, overflow: 'hidden' },
  langBtnActive: {  },
  langText: { color: 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: 15 },
  langTextActive: { color: '#fff', fontWeight: '800' },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(56,189,248,0.1)' },
  settingIconWrapper: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginRight: 12 },
  settingLeft: { flex: 1 },
  settingTitle: { fontSize: 15, color: '#f8fafc', fontWeight: '600' },
});