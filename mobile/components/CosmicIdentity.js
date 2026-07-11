// ═══════════════════════════════════════════════════════════════════════
//  CosmicIdentity — the user's birth-chart identity, extracted from the
//  Home/Today screen and relocated to the Profile tab. Self-contained: it
//  fetches its own birth chart and renders the Birth Signature, chart,
//  lagna reading and personality pattern.
// ═══════════════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import CosmicCard from './ui/CosmicCard';
import SectionHeader from './ui/SectionHeader';
import SriLankanChart from './SriLankanChart';
import PinchableView from './effects/PinchableView';
import CosmicLoader from './effects/CosmicLoader';
import { ZODIAC_IMAGES } from './ZodiacIcons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { boxShadow, textShadow } from '../utils/shadow';
import {
  getLagnaUiCopy, localizedLagnaValue, stripSinhalaParenthetical, PLANET_NAMES_SI,
} from '../utils/lagnaCopy';

var SCREEN_WIDTH = Dimensions.get('window').width;

export default function CosmicIdentity() {
  var { colors } = useTheme();
  var { language } = useLanguage();
  var { user } = useAuth();
  var HT = colors;
  var [chartData, setChartData] = useState(null);
  var [loading, setLoading] = useState(false);
  var birthData = user && user.birthData ? user.birthData : null;

  useEffect(function () {
    if (!birthData || !birthData.dateTime) return;
    var cancelled = false;
    setLoading(true);
    api.getBirthChartBasic(birthData.dateTime, birthData.lat || 6.9271, birthData.lng || 79.8612, language)
      .then(function (res) { if (!cancelled && res && res.success) setChartData(res.data); })
      .catch(function () { /* silent */ })
      .then(function () { if (!cancelled) setLoading(false); });
    return function () { cancelled = true; };
  }, [birthData && birthData.dateTime, birthData && birthData.lat, birthData && birthData.lng, language]);

  if (!birthData || !birthData.dateTime) return null;

  if (loading && !chartData) {
    return (
      <CosmicCard variant="content">
        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
          <CosmicLoader size={48} color="#FFB800" text={language === 'si' ? 'කේන්දරය සකසමින්...' : 'Calculating chart...'} textColor="#FFB800" />
        </View>
      </CosmicCard>
    );
  }
  if (!chartData) return null;

  var lagna = chartData.lagna;
  var moonSign = chartData.moonSign;
  var sunSign = chartData.sunSign;
  var nakshatra = chartData.nakshatra;
  var lagnaName = language === 'si' && lagna && lagna.sinhala ? lagna.sinhala : (lagna && lagna.english) || '--';
  var lagnaEn = (lagna && lagna.english) || '';
  var moonName = language === 'si' && moonSign && moonSign.sinhala ? moonSign.sinhala : (moonSign && moonSign.english) || '--';
  var sunName = language === 'si' && sunSign && sunSign.sinhala ? sunSign.sinhala : (sunSign && sunSign.english) || '--';
  var nakName = nakshatra ? (language === 'si' && nakshatra.sinhala ? nakshatra.sinhala : nakshatra.english || nakshatra.name || '--') : '--';
  var lagnaIdx = lagna && lagna.rashiId ? lagna.rashiId - 1 : 0;

  // Lagna palapala
  var ld = chartData.lagnaDetails;
  var lagnaCopy = getLagnaUiCopy(chartData);
  var showPalapala = ld && ld.description;
  var palapalaTitle = language === 'si' ? (ld && ld.sinhala ? ld.sinhala : 'ලග්න පලාපල') : stripSinhalaParenthetical((ld && ld.english) || 'Your Rising Sign Reading');
  var palapalaDescription = language === 'si'
    ? ((lagnaCopy && lagnaCopy.readingSi) || (ld && ld.descriptionSi) || (ld && ld.description))
    : ((lagnaCopy && lagnaCopy.readingEn) || stripSinhalaParenthetical(ld && ld.description));
  var palapalaTraits = language === 'si'
    ? ((lagnaCopy && lagnaCopy.traitsSi) || (ld && ld.traitsSi) || [])
    : ((lagnaCopy && lagnaCopy.traitsEn) || (ld && ld.traits) || []);
  var gemValue = localizedLagnaValue(lagnaCopy, 'gem', ld && ld.gem, language);
  var colorValue = localizedLagnaValue(lagnaCopy, 'color', ld && ld.luckyColor, language);

  // Personality
  var p = chartData.personality;
  var personalitySummary = lagnaCopy ? (language === 'si' ? lagnaCopy.personalitySi : lagnaCopy.personalityEn) : null;
  var traitsSource = language === 'si'
    ? ((lagnaCopy && lagnaCopy.traitsSi) || (p && p.mainTraitsSi) || [])
    : ((lagnaCopy && lagnaCopy.traitsEn) || (p && p.lagnaTraits) || (p && p.sunTraits) || []);
  if ((!traitsSource || traitsSource.length === 0) && language !== 'si' && p) {
    traitsSource = [].concat(p.lagnaTraits || [], p.moonTraits || [], p.sunTraits || []);
  }
  var uniqueTraits = (traitsSource || []).filter(function (tr, i) { return traitsSource.indexOf(tr) === i; }).slice(0, 8);
  var traitColors = ['#FF8C00', '#93C5FD', '#FFB800', '#F87171', '#34D399', '#6EE7B7', '#FFD666', '#A78BFA'];

  var lagnaRashiId = lagna ? (lagna.rashiId || lagna.id || 1) : 1;
  var miniSize = Math.min(SCREEN_WIDTH - 64, 340);

  return (
    <View style={{ gap: 10 }}>
      {/* ═══ BIRTH SIGNATURE ═══ */}
      <Animated.View entering={FadeInDown.delay(80).springify()}>
        <View style={s.glassIdentity}>
          <LinearGradient colors={['#1A150A', '#15100A', '#0F0B06', '#12100B']} locations={[0, 0.3, 0.65, 1]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <LinearGradient colors={['rgba(218,165,32,0.06)', 'transparent', 'rgba(218,165,32,0.04)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <LinearGradient colors={['rgba(218,165,32,0.08)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%', borderTopLeftRadius: 22, borderTopRightRadius: 22 }} />
          <View style={{ position: 'absolute', top: 5, left: 5, right: 5, bottom: 5, borderRadius: 18, borderWidth: 0.5, borderColor: 'rgba(218,165,32,0.12)' }} />

          <View style={s.glassIdHeader}>
            <View style={s.glassIdMark}>
              <Ionicons name="finger-print-outline" size={15} color={HT.gold} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.glassIdKicker}>{language === 'si' ? 'ඔබේ උපන් ග්‍රහ මුද්‍රාව' : 'BIRTH SIGNATURE'}</Text>
              <Text style={s.glassIdTitle}>{language === 'si' ? 'ඔබේ ග්‍රහ අනන්‍යතාව' : 'Your Cosmic Identity'}</Text>
            </View>
          </View>

          <View style={s.lagnaHero}>
            <LinearGradient colors={['rgba(218,165,32,0.10)', 'rgba(147,51,234,0.04)', 'rgba(0,0,0,0)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <View style={s.lagnaHeroLeft}>
              <View style={s.lagnaSignBig}>
                <LinearGradient colors={['rgba(244,228,188,0.13)', 'rgba(218,165,32,0.04)', 'rgba(0,0,0,0.20)']} style={StyleSheet.absoluteFillObject} />
                <View style={s.lagnaSignHalo} />
                <Image source={ZODIAC_IMAGES[lagnaIdx]} style={s.lagnaSignImage} />
              </View>
            </View>
            <View style={s.lagnaHeroRight}>
              <Text style={[s.lagnaHeroLabel, { color: HT.textMuted }]}>{language === 'si' ? 'ලග්නය' : 'RISING SIGN'}</Text>
              <Text style={[s.lagnaHeroName, { color: HT.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{lagnaName}</Text>
              {lagnaEn && language === 'si' ? <Text style={[s.lagnaHeroSub, { color: HT.textGold }]}>{lagnaEn}</Text> : null}
              {lagna && lagna.lord ? (
                <View style={s.lagnaLordPill}>
                  <Ionicons name="planet" size={11} color={HT.gold} />
                  <Text style={s.lagnaLordText}>{language === 'si' ? 'පාලක ග්‍රහයා: ' : 'Ruling Energy: '}{language === 'si' && PLANET_NAMES_SI[lagna.lord] ? PLANET_NAMES_SI[lagna.lord] : lagna.lord}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={s.glassTrioRow}>
            <Animated.View entering={FadeInDown.delay(180).springify()} style={[s.glassTrioCard, { borderColor: HT.blueBg }]}>
              <LinearGradient colors={[HT.blueBg, 'transparent']} style={StyleSheet.absoluteFill} />
              <View style={[s.glassTrioIcon, { borderColor: HT.blue + '35', backgroundColor: HT.blue + '12' }]}>
                <Ionicons name="moon" size={14} color={HT.blue} />
              </View>
              <Text style={[s.glassTrioLabel, { color: HT.textMuted }]}>{language === 'si' ? 'චන්ද්‍ර රාශිය' : 'Moon Energy'}</Text>
              <Text style={[s.glassTrioValue, { color: HT.blue }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.72}>{moonName}</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(240).springify()} style={[s.glassTrioCard, { borderColor: HT.goldBorder }]}>
              <LinearGradient colors={[HT.goldSubtle, 'transparent']} style={StyleSheet.absoluteFill} />
              <View style={[s.glassTrioIcon, { borderColor: HT.gold + '35', backgroundColor: HT.gold + '12' }]}>
                <Ionicons name="sunny" size={14} color={HT.gold} />
              </View>
              <Text style={[s.glassTrioLabel, { color: HT.textMuted }]}>{language === 'si' ? 'සූර්ය රාශිය' : 'Sun Energy'}</Text>
              <Text style={[s.glassTrioValue, { color: HT.gold }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.72}>{sunName}</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(300).springify()} style={[s.glassTrioCard, { borderColor: HT.tealBg }]}>
              <LinearGradient colors={[HT.tealBg, 'transparent']} style={StyleSheet.absoluteFill} />
              <View style={[s.glassTrioIcon, { borderColor: HT.teal + '35', backgroundColor: HT.teal + '12' }]}>
                <Ionicons name="sparkles" size={14} color={HT.teal} />
              </View>
              <Text style={[s.glassTrioLabel, { color: HT.textMuted }]}>{language === 'si' ? 'උපන් නැකත' : 'Birth Focus'}</Text>
              <Text style={[s.glassTrioValue, { color: HT.teal }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.68}>{nakName}</Text>
            </Animated.View>
          </View>

          <View style={[s.glassTrioRow, { paddingTop: 0 }]}>
            <Animated.View entering={FadeInDown.delay(340).springify()} style={[s.glassTrioCard, { borderColor: 'rgba(168,85,247,0.12)' }]}>
              <LinearGradient colors={['rgba(168,85,247,0.08)', 'transparent']} style={StyleSheet.absoluteFill} />
              <View style={[s.glassTrioIcon, { borderColor: 'rgba(168,85,247,0.35)', backgroundColor: 'rgba(168,85,247,0.12)' }]}>
                <Ionicons name="leaf" size={14} color="#A855F7" />
              </View>
              <Text style={[s.glassTrioLabel, { color: HT.textMuted }]}>{language === 'si' ? 'ස්වභාව රටාව' : 'Nature Style'}</Text>
              <Text style={[s.glassTrioValue, { color: '#A855F7' }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.68}>{nakshatra && nakshatra.lord ? (language === 'si' ? nakshatra.lord + ' බලය' : nakshatra.lord + ' Ruled') : '--'}</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(400).springify()} style={[s.glassTrioCard, { borderColor: 'rgba(34,211,153,0.12)' }]}>
              <LinearGradient colors={['rgba(34,211,153,0.08)', 'transparent']} style={StyleSheet.absoluteFill} />
              <View style={[s.glassTrioIcon, { borderColor: 'rgba(34,211,153,0.35)', backgroundColor: 'rgba(34,211,153,0.12)' }]}>
                <Ionicons name="sync" size={14} color="#22D399" />
              </View>
              <Text style={[s.glassTrioLabel, { color: HT.textMuted }]}>{language === 'si' ? 'ජීවන රිද්මය' : 'Life Rhythm'}</Text>
              <Text style={[s.glassTrioValue, { color: '#22D399' }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.68}>{nakshatra && nakshatra.pada ? (language === 'si' ? 'පාද ' + nakshatra.pada : 'Pada ' + nakshatra.pada + '/4') : '--'}</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(460).springify()} style={[s.glassTrioCard, { borderColor: 'rgba(251,191,36,0.12)' }]}>
              <LinearGradient colors={['rgba(251,191,36,0.08)', 'transparent']} style={StyleSheet.absoluteFill} />
              <View style={[s.glassTrioIcon, { borderColor: 'rgba(251,191,36,0.35)', backgroundColor: 'rgba(251,191,36,0.12)' }]}>
                <Ionicons name="star" size={14} color="#FBBF24" />
              </View>
              <Text style={[s.glassTrioLabel, { color: HT.textMuted }]}>{language === 'si' ? 'උපන් ගුණය' : 'Birth Quality'}</Text>
              <Text style={[s.glassTrioValue, { color: '#FBBF24' }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.68}>{lagna && lagna.lord ? (language === 'si' ? lagna.lord + ' ශක්තිය' : lagna.lord + ' Power') : '--'}</Text>
            </Animated.View>
          </View>
        </View>
      </Animated.View>

      {/* ═══ CHART ═══ */}
      {chartData.rashiChart ? (
        <CosmicCard variant="content" delay={140}>
          <SectionHeader title={language === 'si' ? 'ඔබේ කේන්දර සටහන' : 'Your Birth Chart'} iconName="planet-outline" iconColor={HT.gold} delay={140} />
          <View style={{ alignItems: 'center' }}>
            <PinchableView minScale={1} maxScale={2}>
              <SriLankanChart rashiChart={chartData.rashiChart} lagnaRashiId={lagnaRashiId} language={language} chartSize={miniSize} />
            </PinchableView>
          </View>
        </CosmicCard>
      ) : null}

      {/* ═══ LAGNA READING ═══ */}
      {showPalapala ? (
        <CosmicCard variant="content" delay={200}>
          <SectionHeader title={palapalaTitle} iconName="sparkles-outline" iconColor={HT.gold} delay={200} />
          <Text style={s.palapalaText}>{palapalaDescription}</Text>
          {palapalaTraits && palapalaTraits.length > 0 ? (
            <View style={s.traitsRow}>
              {palapalaTraits.map(function (trait, i) {
                return <View key={i} style={s.traitChip}><Text style={s.traitText}>{trait}</Text></View>;
              })}
            </View>
          ) : null}
          <View style={s.luckyRow}>
            {gemValue ? (
              <View style={s.luckyItem}>
                <View style={s.luckyItemIcon}><Ionicons name="diamond-outline" size={14} color={HT.gold} /></View>
                <Text style={s.luckyLabel}>{gemValue}</Text>
              </View>
            ) : null}
            {colorValue ? (
              <View style={s.luckyItem}>
                <View style={s.luckyItemIcon}><Ionicons name="color-palette-outline" size={14} color={HT.gold} /></View>
                <Text style={s.luckyLabel}>{colorValue}</Text>
              </View>
            ) : null}
          </View>
        </CosmicCard>
      ) : null}

      {/* ═══ PERSONALITY ═══ */}
      {(uniqueTraits.length > 0 || personalitySummary) ? (
        <CosmicCard variant="content" delay={260}>
          <SectionHeader title={language === 'si' ? 'ලග්නයෙන් පෙනෙන ඔබේ ගති ලක්ෂණ' : 'Your Personality Pattern'} iconName="person-outline" iconColor={HT.gold} delay={260} />
          {personalitySummary ? <Text style={s.personalityIntro}>{personalitySummary}</Text> : null}
          {uniqueTraits.length > 0 ? (
            <View style={s.personalityWrap}>
              {uniqueTraits.map(function (trait, i) {
                return (
                  <Animated.View key={i} entering={FadeInUp.delay(300 + i * 40).springify()} style={[s.personalityPill, { borderColor: traitColors[i % traitColors.length] + '28' }]}>
                    <Text style={[s.personalityText, { color: traitColors[i % traitColors.length] }]}>{trait}</Text>
                  </Animated.View>
                );
              })}
            </View>
          ) : null}
        </CosmicCard>
      ) : null}
    </View>
  );
}

var s = StyleSheet.create({
  glassIdentity: {
    borderRadius: 22, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(218,165,32,0.24)',
    ...boxShadow('rgba(180,140,40,0.22)', { width: 0, height: 5 }, 0.16, 18), elevation: 8,
  },
  glassIdHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8,
  },
  glassIdMark: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(218,165,32,0.08)',
    borderWidth: 1, borderColor: 'rgba(218,165,32,0.22)',
  },
  glassIdKicker: { color: 'rgba(218,165,32,0.52)', fontSize: 9, fontWeight: '900', letterSpacing: 1.8, marginBottom: 1 },
  glassIdTitle: { color: '#F4E4BC', fontSize: 17, lineHeight: 22, fontWeight: '900', letterSpacing: 0.2, ...textShadow('rgba(218,165,32,0.22)', { width: 0, height: 1 }, 6) },
  lagnaHero: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 14, marginBottom: 10,
    borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(218,165,32,0.18)',
    padding: 12, gap: 12,
  },
  lagnaHeroLeft: { alignItems: 'center' },
  lagnaSignBig: {
    width: 86, height: 86, borderRadius: 43, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(218,165,32,0.44)',
    backgroundColor: 'rgba(26,21,10,0.60)',
    ...boxShadow('rgba(218,165,32,0.18)', { width: 0, height: 0 }, 0.75, 20),
  },
  lagnaSignHalo: {
    position: 'absolute', width: 70, height: 70, borderRadius: 35,
    borderWidth: 1, borderColor: 'rgba(244,228,188,0.12)',
  },
  lagnaSignImage: { width: 58, height: 58, resizeMode: 'contain' },
  lagnaHeroRight: { flex: 1 },
  lagnaHeroLabel: {
    color: 'rgba(218,165,32,0.50)', fontSize: 11, fontWeight: '700',
    letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 2,
  },
  lagnaHeroName: { color: '#DAA520', fontSize: 28, lineHeight: 34, fontWeight: '900', letterSpacing: 0, ...textShadow('rgba(218,165,32,0.34)', { width: 0, height: 1 }, 10) },
  lagnaHeroSub: { color: 'rgba(218,165,32,0.55)', fontSize: 14, fontWeight: '600', marginTop: 2 },
  lagnaLordPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 7,
    alignSelf: 'flex-start', backgroundColor: 'rgba(218,165,32,0.06)',
    borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(218,165,32,0.15)',
  },
  lagnaLordText: { color: '#DAA520', fontSize: 11, fontWeight: '700' },
  glassTrioRow: { flexDirection: 'row', gap: 7, paddingHorizontal: 14, paddingBottom: 14 },
  glassTrioCard: {
    flex: 1, minHeight: 88, borderRadius: 15, overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 10,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, gap: 3,
    backgroundColor: 'rgba(218,165,32,0.03)', borderColor: 'rgba(218,165,32,0.10)',
  },
  glassTrioIcon: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginBottom: 2,
  },
  glassTrioLabel: {
    color: 'rgba(218,165,32,0.50)', fontSize: 9, fontWeight: '800',
    letterSpacing: 0.8, textTransform: 'uppercase', textAlign: 'center',
  },
  glassTrioValue: { fontSize: 12.5, lineHeight: 16, fontWeight: '900', textAlign: 'center', width: '100%', minHeight: 32 },
  palapalaText: { color: 'rgba(244,228,188,0.65)', fontSize: 14, lineHeight: 24, marginBottom: 16 },
  traitsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  traitChip: {
    backgroundColor: 'rgba(218,165,32,0.08)', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(218,165,32,0.18)',
  },
  traitText: { color: '#DAA520', fontSize: 12, fontWeight: '600' },
  luckyRow: { flexDirection: 'row', gap: 8 },
  luckyItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(218,165,32,0.05)', borderRadius: 12, padding: 8,
    borderWidth: 1, borderColor: 'rgba(218,165,32,0.12)',
  },
  luckyItemIcon: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(218,165,32,0.08)',
    borderWidth: 1, borderColor: 'rgba(218,165,32,0.18)',
  },
  luckyLabel: { color: '#F4E4BC', fontSize: 12, fontWeight: '600', flex: 1 },
  personalityIntro: { color: 'rgba(244,228,188,0.66)', fontSize: 14, lineHeight: 23, marginBottom: 14 },
  personalityWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  personalityPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(218,165,32,0.04)', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1,
  },
  personalityText: { fontSize: 12, fontWeight: '700' },
});
