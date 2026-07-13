// WeeklyShareCard — branded, capturable card set for sharing weekly forecast as images.
// Supports 3 pages via `page` prop. Captured with html-to-image (web) or view-shot (native).
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ZODIAC_IMAGES } from './ZodiacIcons';
import APP_LOGO_IMAGE from '../assets/logo-inline';

var CARD_W = 360;
var CARD_H = 640;

var OUTLOOK = {
  favorable: { color: '#34D399', glow: 'rgba(52,211,153,0.30)', icon: 'trending-up', en: 'Favorable Week', si: 'සුබ සතියක්' },
  mixed: { color: '#FFB800', glow: 'rgba(255,184,0,0.28)', icon: 'swap-horizontal', en: 'Mixed Week', si: 'මිශ්‍ර සතියක්' },
  challenging: { color: '#F87171', glow: 'rgba(248,113,113,0.28)', icon: 'shield-half', en: 'Stay Mindful', si: 'පරිස්සමින්' },
};

var STARS = [
  [10, 8, 2], [88, 12, 1.5], [30, 5, 1], [70, 22, 2.5], [16, 30, 1.5],
  [92, 38, 2], [6, 52, 1.5], [94, 60, 2.5], [22, 72, 1], [80, 80, 2],
  [12, 88, 1.5], [60, 92, 2], [44, 16, 1], [50, 78, 1.5], [84, 70, 1],
];

function CardShell(props) {
  var cfg = props.cfg || OUTLOOK.mixed;
  return (
    <View style={c.card}>
      <LinearGradient
        colors={['#0E0726', '#241046', '#3A1466', '#160A33', '#04030C']}
        locations={[0, 0.32, 0.55, 0.8, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
      />
      <LinearGradient
        colors={['rgba(168,85,247,0.32)', 'rgba(124,58,237,0.10)', 'transparent']}
        style={{ position: 'absolute', top: '-12%', left: '-20%', width: '90%', height: '55%', borderRadius: 400 }}
      />
      <LinearGradient
        colors={['rgba(236,72,153,0.22)', 'transparent']}
        style={{ position: 'absolute', top: '8%', right: '-25%', width: '80%', height: '45%', borderRadius: 400 }}
      />
      <LinearGradient
        colors={['transparent', 'rgba(59,130,246,0.16)']}
        style={{ position: 'absolute', bottom: '-10%', left: '-15%', width: '90%', height: '45%', borderRadius: 400 }}
      />
      <LinearGradient
        colors={[cfg.glow, 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '38%' }}
      />
      <LinearGradient
        colors={['transparent', 'rgba(218,165,32,0.12)']}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '28%' }}
      />
      {STARS.map(function (st, i) {
        return <View key={i} style={{ position: 'absolute', left: st[0] + '%', top: st[1] + '%', width: st[2], height: st[2], borderRadius: st[2], backgroundColor: 'rgba(255,233,180,' + (0.35 + (i % 3) * 0.15) + ')' }} />;
      })}
      <View style={c.frame} pointerEvents="none" />
      {props.children}
    </View>
  );
}

function BrandHeader(props) {
  return (
    <View style={c.brandRow}>
      <Image source={APP_LOGO_IMAGE} style={c.logo} resizeMode="contain" />
      <View>
        <Text style={c.brandName}>GRAHACHARA</Text>
        <Text style={c.brandTag}>{props.si ? 'ශ්‍රී ලාංකික ජ්‍යෝතිෂය' : 'Vedic Astrology'}</Text>
      </View>
    </View>
  );
}

function PageIndicator(props) {
  return (
    <View style={c.pageRow}>
      {[1, 2, 3].map(function (p) {
        return <View key={p} style={[c.pageDot, p === props.page && c.pageDotActive]} />;
      })}
    </View>
  );
}

function FooterCTA(props) {
  return (
    <View style={c.footer}>
      <View style={c.footerDivider} />
      <Text style={c.footerCta}>{props.si ? 'ඔබේ සම්පූර්ණ පලාපල නොමිලේ' : 'Get your full reading — free'}</Text>
      <View style={c.footerHandleRow}>
        <Ionicons name="sparkles" size={12} color="#FBBF24" />
        <Text style={c.footerHandle}>grahachara.com</Text>
        <Ionicons name="sparkles" size={12} color="#FBBF24" />
      </View>
      <View style={c.storeRow}>
        <Ionicons name="logo-google-playstore" size={11} color="rgba(244,228,180,0.75)" />
        <Text style={c.storeText}>{props.si ? 'Play Store එකෙන් බාගන්න' : 'Now on Google Play'}</Text>
      </View>
    </View>
  );
}

function SectionBlock(props) {
  if (!props.text) return null;
  return (
    <View style={c.sectionBox}>
      <View style={c.sectionHeader}>
        <Ionicons name={props.icon} size={14} color={props.color || '#A78BFA'} />
        <Text style={c.sectionTitle}>{props.title}</Text>
      </View>
      <Text style={c.sectionBody} numberOfLines={props.lines || 5}>{props.text}</Text>
    </View>
  );
}

// PAGE 1: Overview
function Page1(props) {
  var report = props.report;
  var si = props.si;
  var cfg = props.cfg;
  var weekLabel = props.weekLabel;
  var signImg = ZODIAC_IMAGES[((report.lagnaId || 1) - 1) % 12];
  var signName = si ? (report.nameSi || report.nameEn) : (report.nameEn || report.nameSi);
  var signSub = si ? (report.nameEn || '') : (report.nameSi || '');
  var overall = si ? (report.overallSi || report.overallEn) : (report.overallEn || report.overallSi);
  var outlookLabel = si ? cfg.si : cfg.en;

  return (
    <CardShell cfg={cfg}>
      <BrandHeader si={si} />
      <View style={c.kickerWrap}>
        <View style={c.kickerLine} />
        <Text style={c.kicker}>{si ? '\u0DB8\u0DD9 \u0DC3\u0DAD\u0DD2\u0DBA\u0DD9 \u0DBD\u0D9C\u0DCA\u0DB1 \u0DB4\u0DBD\u0DCF\u0DB4\u0DBD' : 'WEEKLY FORECAST'}</Text>
        <View style={c.kickerLine} />
      </View>
      {weekLabel ? <Text style={c.week}>{weekLabel}</Text> : null}
      <Text style={c.hook}>{si ? 'තරු ඔබ ගැන කියන දේ — මේ සතියේ' : 'What the stars have planned for you'}</Text>
      <View style={c.medallionWrap}>
        <View style={[c.medallionGlow, { backgroundColor: cfg.glow }]} />
        <View style={c.medallionRing} />
        <View style={c.medallion}>
          <LinearGradient colors={['rgba(252,211,77,0.22)', 'rgba(218,165,32,0.06)', 'rgba(0,0,0,0.28)']} style={StyleSheet.absoluteFillObject} />
          {signImg ? <Image source={signImg} style={c.signImg} resizeMode="contain" /> : null}
        </View>
      </View>
      <Text style={c.signName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{signName}</Text>
      {signSub ? <Text style={c.signSub}>{signSub}</Text> : null}
      <View style={[c.pill, { borderColor: cfg.color + '55', backgroundColor: cfg.color + '1A' }]}>
        <Ionicons name={cfg.icon} size={14} color={cfg.color} />
        <Text style={[c.pillText, { color: cfg.color }]}>{outlookLabel}</Text>
      </View>
      {overall ? (
        <View style={c.quoteWrap}>
          <Text style={c.quoteMark}>{'"'}</Text>
          <Text style={c.overall} numberOfLines={6}>{overall}</Text>
        </View>
      ) : null}
      <PageIndicator page={1} />
      <FooterCTA si={si} />
    </CardShell>
  );
}

// PAGE 2: Life Areas
function Page2(props) {
  var report = props.report;
  var si = props.si;
  var cfg = props.cfg;
  var signName = si ? (report.nameSi || report.nameEn) : (report.nameEn || report.nameSi);
  return (
    <CardShell cfg={cfg}>
      <BrandHeader si={si} />
      <View style={c.pageTitle}>
        <Text style={c.pageTitleText}>{signName}</Text>
        <Text style={c.pageSubtitle}>{si ? '\u0DA2\u0DD3\u0DC0\u0DD2\u0DAD\u0DBA\u0DD9 \u0D9A\u0DCA\u0DC2\u0DD9\u0DAD\u0DCA\u200D\u0DBB' : 'Life Areas'}</Text>
      </View>
      <SectionBlock icon="briefcase-outline" color="#FFB800" title={si ? '\u0DBB\u0DD0\u0D9A\u0DD2\u0DBA\u0DCF\u0DC0 \u0DC3\u0DC4 \u0DB8\u0DD4\u0DAF\u0DBD\u0DCA' : 'Career & Finance'} text={si ? (report.careerSi || report.careerEn) : (report.careerEn || report.careerSi)} lines={6} />
      <SectionBlock icon="school-outline" color="#60A5FA" title={si ? '\u0D85\u0DB0\u0DCA\u200D\u0DBA\u0DCF\u0DB4\u0DB1\u0DBA' : 'Education & Learning'} text={si ? (report.educationSi || report.educationEn) : (report.educationEn || report.educationSi)} lines={5} />
      <SectionBlock icon="fitness-outline" color="#34D399" title={si ? 'සෞඛ්‍යය' : 'Health & Wellbeing'} text={si ? (report.healthSi || report.healthEn) : (report.healthEn || report.healthSi)} lines={5} />
      {(report.transitEn || report.transitSi) ? (
        <SectionBlock icon="planet-outline" color="#818CF8" title={si ? 'ග්‍රහ ගමන්' : 'Planetary Transits'} text={si ? (report.transitSi || report.transitEn) : (report.transitEn || report.transitSi)} lines={4} />
      ) : null}
      <PageIndicator page={2} />
      <FooterCTA si={si} />
    </CardShell>
  );
}

// PAGE 3: Personal & Spiritual
function Page3(props) {
  var report = props.report;
  var si = props.si;
  var cfg = props.cfg;
  var signName = si ? (report.nameSi || report.nameEn) : (report.nameEn || report.nameSi);
  return (
    <CardShell cfg={cfg}>
      <BrandHeader si={si} />
      <View style={c.pageTitle}>
        <Text style={c.pageTitleText}>{signName}</Text>
        <Text style={c.pageSubtitle}>{si ? '\u0DB4\u0DD5\u0DAF\u0DCA\u0D9C\u0DBD\u0DD2\u0D9A' : 'Personal & Spiritual'}</Text>
      </View>
      <SectionBlock icon="heart-outline" color="#F472B6" title={si ? '\u0DC3\u0DB6\u0DB3\u0DAD\u0DCF' : 'Relationships'} text={si ? (report.relationshipSi || report.relationshipEn) : (report.relationshipEn || report.relationshipSi)} lines={4} />
      <SectionBlock icon="people-outline" color="#FB923C" title={si ? '\u0DB4\u0DC0\u0DD4\u0DBD' : 'Family & Home'} text={si ? (report.familySi || report.familyEn) : (report.familyEn || report.familySi)} lines={4} />
      <SectionBlock icon="flower-outline" color="#C084FC" title={si ? '\u0D86\u0DB0\u0DCA\u200D\u0DBA\u0DCF\u0DAD\u0DCA\u0DB8\u0DD2\u0D9A' : 'Spiritual'} text={si ? (report.spiritualSi || report.spiritualEn) : (report.spiritualEn || report.spiritualSi)} lines={3} />
      <View style={c.luckyRow}>
        {report.luckyDay ? (
          <View style={c.luckyChip}>
            <Ionicons name="calendar-clear-outline" size={11} color="#FBBF24" />
            <Text style={c.luckyText}>{si ? (report.luckyDay.si || report.luckyDay.en) : (report.luckyDay.en || report.luckyDay.si)}</Text>
          </View>
        ) : null}
        {report.luckyColor ? (
          <View style={c.luckyChip}>
            <Ionicons name="color-palette-outline" size={11} color="#FBBF24" />
            <Text style={c.luckyText}>{si ? (report.luckyColor.si || report.luckyColor.en) : (report.luckyColor.en || report.luckyColor.si)}</Text>
          </View>
        ) : null}
        {report.luckyNumber ? (
          <View style={c.luckyChip}>
            <Ionicons name="keypad-outline" size={11} color="#FBBF24" />
            <Text style={c.luckyText}>{report.luckyNumber}</Text>
          </View>
        ) : null}
      </View>
      {(report.adviceEn || report.adviceSi) ? (
        <View style={c.adviceBox}>
          <Ionicons name="bulb-outline" size={13} color="#FBBF24" />
          <Text style={c.remedyText} numberOfLines={3}>{si ? (report.adviceSi || report.adviceEn) : (report.adviceEn || report.adviceSi)}</Text>
        </View>
      ) : null}
      <PageIndicator page={3} />
      <FooterCTA si={si} />
    </CardShell>
  );
}

var WeeklyShareCard = React.forwardRef(function WeeklyShareCard(props, ref) {
  var report = props.report || {};
  var weekLabel = props.weekLabel || '';
  var language = props.language || 'en';
  var page = props.page || 1;
  var si = language === 'si';
  var cfg = OUTLOOK[report.outlook] || OUTLOOK.mixed;

  var content = null;
  if (page === 1) content = <Page1 report={report} si={si} cfg={cfg} weekLabel={weekLabel} />;
  else if (page === 2) content = <Page2 report={report} si={si} cfg={cfg} />;
  else content = <Page3 report={report} si={si} cfg={cfg} />;

  return (
    <View ref={ref} collapsable={false} style={{ width: CARD_W, height: CARD_H }}>
      {content}
    </View>
  );
});

var c = StyleSheet.create({
  card: {
    width: CARD_W, height: CARD_H, borderRadius: 28, overflow: 'hidden',
    backgroundColor: '#04030C', alignItems: 'center', paddingTop: 22, paddingHorizontal: 20,
  },
  frame: {
    position: 'absolute', top: 10, left: 10, right: 10, bottom: 10,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(218,165,32,0.22)',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 },
  logo: { width: 28, height: 28, borderRadius: 7 },
  brandName: { color: '#FBBF24', fontSize: 14, fontWeight: '800', letterSpacing: 2.5 },
  brandTag: { color: 'rgba(244,228,188,0.60)', fontSize: 8, letterSpacing: 1, marginTop: 1 },
  kickerWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  kickerLine: { width: 24, height: 1, backgroundColor: 'rgba(218,165,32,0.4)' },
  kicker: { color: 'rgba(255,233,180,0.85)', fontSize: 10.5, fontWeight: '700', letterSpacing: 2 },
  week: { color: '#FBBF24', fontSize: 12, fontWeight: '600', marginTop: 5, letterSpacing: 0.5 },
  hook: { color: '#FDE9B8', fontSize: 15, fontWeight: '700', textAlign: 'center', marginTop: 10, paddingHorizontal: 16, lineHeight: 21, textShadowColor: 'rgba(251,191,36,0.35)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  medallionWrap: { marginTop: 18, marginBottom: 16, alignItems: 'center', justifyContent: 'center' },
  medallionGlow: { position: 'absolute', width: 168, height: 168, borderRadius: 84, opacity: 0.95 },
  medallionRing: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 1, borderColor: 'rgba(252,211,77,0.30)' },
  medallion: {
    width: 124, height: 124, borderRadius: 62, overflow: 'hidden',
    borderWidth: 2.5, borderColor: 'rgba(252,211,77,0.65)',
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(24,16,10,0.65)',
  },
  signImg: { width: 86, height: 86 },
  signName: { color: '#FCD34D', fontSize: 27, fontWeight: '800', letterSpacing: 0.8, textAlign: 'center', textShadowColor: 'rgba(251,191,36,0.55)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 14 },
  signSub: { color: 'rgba(244,228,188,0.70)', fontSize: 12, marginTop: 3, letterSpacing: 1.5 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, marginTop: 12,
  },
  pillText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  quoteWrap: { marginTop: 14, paddingHorizontal: 4, alignItems: 'center', flex: 1 },
  quoteMark: { color: 'rgba(218,165,32,0.40)', fontSize: 30, height: 22, lineHeight: 36, fontWeight: '800' },
  overall: { color: 'rgba(236,230,245,0.90)', fontSize: 12.5, lineHeight: 19, textAlign: 'center', marginTop: 2 },
  pageTitle: { alignItems: 'center', marginBottom: 12 },
  pageTitleText: { color: '#FCD34D', fontSize: 21, fontWeight: '800', letterSpacing: 0.5, textShadowColor: 'rgba(251,191,36,0.45)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 },
  pageSubtitle: { color: 'rgba(244,228,188,0.70)', fontSize: 11, letterSpacing: 1.5, marginTop: 4, fontWeight: '600' },
  sectionBox: { width: '100%', marginBottom: 10, paddingHorizontal: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  sectionTitle: { color: 'rgba(255,233,180,0.90)', fontSize: 11.5, fontWeight: '700', letterSpacing: 0.5 },
  sectionBody: { color: 'rgba(236,230,245,0.85)', fontSize: 11.5, lineHeight: 17 },
  luckyRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' },
  luckyChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.30)', backgroundColor: 'rgba(251,191,36,0.08)',
  },
  luckyText: { color: '#FBBF24', fontSize: 11, fontWeight: '700' },
  adviceBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    marginTop: 10, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.22)', backgroundColor: 'rgba(251,191,36,0.06)',
  },
  remedyText: { color: 'rgba(236,230,245,0.85)', fontSize: 11, lineHeight: 16, flex: 1 },
  pageRow: { flexDirection: 'row', gap: 6, marginTop: 'auto', paddingTop: 10 },
  pageDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,233,180,0.20)' },
  pageDotActive: { width: 18, borderRadius: 3, backgroundColor: '#FBBF24' },
  footer: { alignItems: 'center', paddingBottom: 6, marginTop: 8 },
  footerDivider: { width: 100, height: 1, backgroundColor: 'rgba(218,165,32,0.25)', marginBottom: 8 },
  footerCta: { color: 'rgba(255,233,180,0.80)', fontSize: 10.5, fontWeight: '600', letterSpacing: 0.5 },
  footerHandleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  footerHandle: { color: '#FBBF24', fontSize: 12.5, fontWeight: '800', letterSpacing: 1 },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 },
  storeText: { color: 'rgba(244,228,180,0.75)', fontSize: 9.5, fontWeight: '600', letterSpacing: 0.5 },
});

export default WeeklyShareCard;
export { CARD_W, CARD_H };
