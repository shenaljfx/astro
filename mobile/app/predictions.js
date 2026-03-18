import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Dimensions, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../services/api';
import { Colors } from '../constants/theme';

var { width: SW } = Dimensions.get('window');

var EVENT_LABELS = {
  marriage:       { en: 'Marriage',        si: 'විවාහය',         icon: 'heart' },
  career_change:  { en: 'Career Change',   si: 'වෘත්තීය වෙනස', icon: 'briefcase' },
  children:       { en: 'Children',        si: 'දරුවන්',        icon: 'people' },
  foreign_travel: { en: 'Foreign Travel',  si: 'විදේශ ගමන්',    icon: 'airplane' },
  wealth_gain:    { en: 'Wealth Gain',     si: 'ධන ලාභ',        icon: 'cash' },
  property:       { en: 'Property',        si: 'දේපළ',          icon: 'home' },
  education:      { en: 'Education',       si: 'අධ්‍යාපනය',      icon: 'school' },
  health_crisis:  { en: 'Health Alert',    si: 'සෞඛ්‍ය අවදානම', icon: 'fitness' },
  business:       { en: 'Business',        si: 'ව්‍යාපාර',      icon: 'business' },
  love_affair:    { en: 'Love',            si: 'ප්‍රේමය',       icon: 'heart-half' },
};

var SECTIONS = [
  { key: 'kp', title: 'Life Event Predictions', titleSi: 'ජීවිත සිදුවීම් අනාවැකි', icon: 'flash' },
  { key: 'transit', title: 'Transit Dashboard', titleSi: 'ගෝචර විග්‍රහය', icon: 'planet' },
  { key: 'annual', title: 'Annual Forecast', titleSi: 'වාර්ෂික අනාවැකි', icon: 'calendar' },
];

export default function PredictionsScreen() {
  var insets = useSafeAreaInsets();
  var router = useRouter();
  var { user } = useAuth();
  var { language } = useLanguage();
  var si = language === 'si';

  var [activeSection, setActiveSection] = useState('kp');
  var [kpData, setKpData] = useState(null);
  var [transitData, setTransitData] = useState(null);
  var [annualData, setAnnualData] = useState(null);
  var [confidenceData, setConfidenceData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [refreshing, setRefreshing] = useState(false);

  var birthData = user?.birthData || {};
  var birthDateTime = birthData.dateTime || birthData.birthDate || null;

  var loadData = useCallback(async function () {
    if (!birthDateTime) { setLoading(false); return; }
    var params = {
      birthDate: birthDateTime,
      lat: birthData.lat,
      lng: birthData.lng,
    };
    try {
      if (activeSection === 'kp') {
        var [kpRes, confRes] = await Promise.all([
          api.kpPredictAll(params).catch(function () { return null; }),
          api.getAllConfidences(params).catch(function () { return null; }),
        ]);
        if (kpRes?.data) setKpData(kpRes.data);
        if (confRes?.data) setConfidenceData(confRes.data);
      } else if (activeSection === 'transit') {
        var tRes = await api.getEnhancedTransits(params).catch(function () { return null; });
        if (tRes?.data) setTransitData(tRes.data);
      } else if (activeSection === 'annual') {
        var aRes = await api.getAnnualForecast({ ...params, year: new Date().getFullYear() }).catch(function () { return null; });
        if (aRes?.data) setAnnualData(aRes.data);
      }
    } catch (_) {}
    setLoading(false);
    setRefreshing(false);
  }, [activeSection, birthDateTime]);

  useEffect(function () {
    setLoading(true);
    loadData();
  }, [activeSection]);

  function renderKPSection() {
    if (!kpData) return renderEmpty();
    return Object.entries(kpData).map(function ([eventKey, pred]) {
      var label = EVENT_LABELS[eventKey] || { en: eventKey, si: eventKey, icon: 'help' };
      var conf = confidenceData?.[eventKey];
      var predColor = pred.prediction === 'YES' ? '#34D399' : pred.prediction === 'NO' ? '#F87171' : '#FBBF24';
      return (
        <View key={eventKey} style={s.eventCard}>
          <View style={s.eventHeader}>
            <Ionicons name={label.icon} size={20} color={predColor} />
            <Text style={s.eventName}>{si ? label.si : label.en}</Text>
            <View style={[s.predBadge, { backgroundColor: predColor + '22' }]}>
              <Text style={[s.predText, { color: predColor }]}>{pred.prediction}</Text>
            </View>
          </View>
          <View style={s.eventMeta}>
            <Text style={s.metaLabel}>{si ? 'විශ්වාසය' : 'Confidence'}</Text>
            <View style={s.confBarBg}>
              <View style={[s.confBarFill, { width: (pred.confidence || 50) + '%', backgroundColor: predColor }]} />
            </View>
            <Text style={s.confPct}>{pred.confidence || 50}%</Text>
          </View>
          {conf && (
            <View style={s.eventMeta}>
              <Text style={s.metaLabel}>{si ? 'ව්‍යුහාත්මක ලකුණු' : 'System Score'}</Text>
              <Text style={s.metaValue}>{conf.confidenceScore}% — {conf.label}</Text>
            </View>
          )}
          {pred.reasons && pred.reasons.length > 0 && (
            <Text style={s.reason} numberOfLines={2}>{pred.reasons[0]}</Text>
          )}
        </View>
      );
    });
  }

  function renderTransitSection() {
    if (!transitData) return renderEmpty();
    var planets = transitData.planets || {};
    return (
      <View>
        <View style={s.transitHeader}>
          <Text style={s.transitScore}>{transitData.compositeAshtakavargaScore || '--'}</Text>
          <Text style={s.transitLabel}>{transitData.compositeLabel || (si ? 'මිශ්‍ර' : 'Mixed')}</Text>
        </View>
        {transitData.doubleTransits && transitData.doubleTransits.length > 0 && (
          <View style={s.doubleTransit}>
            <Ionicons name="flash" size={14} color="#FFD700" />
            <Text style={s.dtText}>{si ? 'ද්විත්ව ගෝචර:' : 'Double Transit:'} {transitData.doubleTransits.map(function (dt) { return (si ? 'භවනය ' : 'House ') + dt.house; }).join(', ')}</Text>
          </View>
        )}
        {Object.entries(planets).map(function ([key, p]) {
          var scoreColor = (p.ashtakavargaScore || 50) >= 60 ? '#34D399' : (p.ashtakavargaScore || 50) >= 40 ? '#FBBF24' : '#F87171';
          return (
            <View key={key} style={s.transitRow}>
              <Text style={s.transitPlanet}>{p.planet}</Text>
              <Text style={s.transitSign}>{p.transitRashi}</Text>
              <View style={[s.scoreBadge, { backgroundColor: scoreColor + '22' }]}>
                <Text style={[s.scoreText, { color: scoreColor }]}>{p.ashtakavargaScore || '--'}</Text>
              </View>
              {p.kakshya && <Text style={s.kakshyaText}>{p.kakshya.kakshyaLord}</Text>}
            </View>
          );
        })}
      </View>
    );
  }

  function renderAnnualSection() {
    if (!annualData) return renderEmpty();
    return (
      <View>
        <View style={s.annualHeader}>
          <Text style={s.annualYear}>{annualData.year}</Text>
          <Text style={s.annualAge}>{si ? 'වයස ' : 'Age '}{annualData.age}</Text>
          <View style={[s.predBadge, { backgroundColor: annualData.yearScore >= 55 ? '#34D39922' : '#F8717122' }]}>
            <Text style={[s.predText, { color: annualData.yearScore >= 55 ? '#34D399' : '#F87171' }]}>{annualData.yearOutlook}</Text>
          </View>
        </View>
        <View style={s.annualScore}>
          <Text style={s.transitScore}>{annualData.yearScore}</Text>
          <Text style={s.transitLabel}>{si ? 'වාර්ෂික ලකුණු' : 'Year Score'}</Text>
        </View>
        <View style={s.munthaBox}>
          <Text style={s.sectionTitle}>{si ? 'මුන්ථා' : 'Muntha'}</Text>
          <Text style={s.metaValue}>{annualData.muntha?.munthaSign} — {si ? 'භවනය ' : 'House '}{annualData.muntha?.munthaHouse} — {annualData.muntha?.effect}</Text>
        </View>
        {annualData.tajakaYogas && annualData.tajakaYogas.length > 0 && (
          <View style={s.munthaBox}>
            <Text style={s.sectionTitle}>{si ? 'තාජක යෝග' : 'Tajaka Yogas'}</Text>
            {annualData.tajakaYogas.map(function (y, i) {
              return <Text key={i} style={s.reason}>{y.name}: {y.effect}</Text>;
            })}
          </View>
        )}
        {annualData.muddaDasha && annualData.muddaDasha.length > 0 && (
          <View style={s.munthaBox}>
            <Text style={s.sectionTitle}>{si ? 'මුද්දා දශා' : 'Mudda Dasha'}</Text>
            {annualData.muddaDasha.slice(0, 5).map(function (d, i) {
              return (
                <View key={i} style={s.dashRow}>
                  <Text style={s.dashLord}>{d.lord}</Text>
                  <Text style={s.dashDays}>{d.days} {si ? 'දින' : 'days'}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  }

  function renderEmpty() {
    return (
      <View style={s.emptyWrap}>
        <Ionicons name="telescope" size={48} color="rgba(255,255,255,0.2)" />
        <Text style={s.emptyText}>{si ? 'උපන් දත්ත අවශ්‍යයි' : 'Birth data required for predictions'}</Text>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#0A0A1A', '#0F0F2E', '#0A0A1A']} style={StyleSheet.absoluteFillObject} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={function () { router.back(); }} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{si ? 'අනාවැකි' : 'Predictions'}</Text>
      </View>

      {/* Section Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabs} contentContainerStyle={s.tabsContent}>
        {SECTIONS.map(function (sec) {
          var active = activeSection === sec.key;
          return (
            <TouchableOpacity key={sec.key} onPress={function () { setActiveSection(sec.key); }} style={[s.tab, active && s.tabActive]}>
              <Ionicons name={sec.icon} size={16} color={active ? '#FFD700' : 'rgba(255,255,255,0.5)'} />
              <Text style={[s.tabText, active && s.tabTextActive]}>{si ? sec.titleSi : sec.title}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      <ScrollView
        style={s.content}
        contentContainerStyle={s.contentInner}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={function () { setRefreshing(true); loadData(); }} tintColor="#FFD700" />}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#FFD700" style={{ marginTop: 60 }} />
        ) : (
          activeSection === 'kp' ? renderKPSection()
          : activeSection === 'transit' ? renderTransitSection()
          : renderAnnualSection()
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

var s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A1A' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  tabs: { maxHeight: 48, marginBottom: 4 },
  tabsContent: { paddingHorizontal: 16, gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)' },
  tabActive: { backgroundColor: 'rgba(255,215,0,0.12)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
  tabText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  tabTextActive: { color: '#FFD700' },
  content: { flex: 1 },
  contentInner: { paddingHorizontal: 16, paddingTop: 12 },

  eventCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  eventHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  eventName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#fff' },
  predBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  predText: { fontSize: 12, fontWeight: '700' },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  metaLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', width: 80 },
  metaValue: { fontSize: 12, color: 'rgba(255,255,255,0.7)', flex: 1 },
  confBarBg: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)' },
  confBarFill: { height: 6, borderRadius: 3 },
  confPct: { fontSize: 11, color: 'rgba(255,255,255,0.5)', width: 32, textAlign: 'right' },
  reason: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 6, lineHeight: 16 },

  transitHeader: { alignItems: 'center', marginBottom: 16 },
  transitScore: { fontSize: 48, fontWeight: '700', color: '#FFD700' },
  transitLabel: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  doubleTransit: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,215,0,0.08)', padding: 10, borderRadius: 10, marginBottom: 12 },
  dtText: { fontSize: 12, color: '#FFD700', flex: 1 },
  transitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.06)' },
  transitPlanet: { width: 70, fontSize: 14, fontWeight: '600', color: '#fff' },
  transitSign: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  scoreBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  scoreText: { fontSize: 13, fontWeight: '700' },
  kakshyaText: { fontSize: 11, color: 'rgba(255,255,255,0.3)', width: 60, textAlign: 'right' },

  annualHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  annualYear: { fontSize: 24, fontWeight: '700', color: '#fff' },
  annualAge: { fontSize: 14, color: 'rgba(255,255,255,0.4)', flex: 1 },
  annualScore: { alignItems: 'center', marginBottom: 16 },
  munthaBox: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14, marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#FFD700', marginBottom: 8 },
  dashRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  dashLord: { fontSize: 13, color: '#fff', fontWeight: '600' },
  dashDays: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },

  emptyWrap: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14, color: 'rgba(255,255,255,0.3)' },
});
