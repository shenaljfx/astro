import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl, TouchableOpacity,
  StyleSheet, ActivityIndicator, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import CosmicBackground from '../../components/CosmicBackground';
import SriLankanChart from '../../components/SriLankanChart';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const RASHI_SI = {
  1: 'මේෂ', 2: 'වෘෂභ', 3: 'මිථුන', 4: 'කටක',
  5: 'සිංහ', 6: 'කන්‍යා', 7: 'තුලා', 8: 'වෘශ්චික',
  9: 'ධනු', 10: 'මකර', 11: 'කුම්භ', 12: 'මීන'
};

const RASHI_EN = {
  1: 'Aries', 2: 'Taurus', 3: 'Gemini', 4: 'Cancer',
  5: 'Leo', 6: 'Virgo', 7: 'Libra', 8: 'Scorpio',
  9: 'Sagittarius', 10: 'Capricorn', 11: 'Aquarius', 12: 'Pisces'
};

const PLANET_INFO = {
  'Sun':     { si: 'රවි', en: 'Su', color: '#fbbf24' },
  'Moon':    { si: 'චන්ද්‍ර', en: 'Mo', color: '#c7d2fe' },
  'Mars':    { si: 'කුජ', en: 'Ma', color: '#f87171' },
  'Mercury': { si: 'බුධ', en: 'Me', color: '#6ee7b7' },
  'Jupiter': { si: 'ගුරු', en: 'Ju', color: '#fbbf24' },
  'Venus':   { si: 'සිකුරු', en: 'Ve', color: '#f9a8d4' },
  'Saturn':  { si: 'ශනි', en: 'Sa', color: '#a5b4fc' },
  'Rahu':    { si: 'රාහු', en: 'Ra', color: '#94a3b8' },
  'Ketu':    { si: 'කේතු', en: 'Ke', color: '#c4b5fd' },
  'Lagna':   { si: 'ලග්න', en: 'Lg', color: '#eab308' },
  'Ascendant':{ si: 'ලග්න', en: 'Lg', color: '#eab308' },
  'Surya':   { si: 'රවි', en: 'Su', color: '#fbbf24' },
  'Chandra': { si: 'චන්ද්‍ර', en: 'Mo', color: '#c7d2fe' },
  'Mangala': { si: 'කුජ', en: 'Ma', color: '#f87171' },
  'Budha':   { si: 'බුධ', en: 'Me', color: '#6ee7b7' },
  'Guru':    { si: 'ගුරු', en: 'Ju', color: '#fbbf24' },
  'Shukra':  { si: 'සිකුරු', en: 'Ve', color: '#f9a8d4' },
  'Shani':   { si: 'ශනි', en: 'Sa', color: '#a5b4fc' },
};

function formatDegree(deg) {
  if (deg == null || isNaN(deg)) return '';
  const d = Math.floor(deg);
  const m = Math.round((deg - d) * 60);
  return String(d).padStart(2, '0') + '\u00B0' + String(m).padStart(2, '0');
}

function toSLT(isoOrObj) {
  if (!isoOrObj) return '--:--';
  if (typeof isoOrObj === 'object' && isoOrObj.display) return isoOrObj.display;
  const d = new Date(isoOrObj);
  if (isNaN(d.getTime())) return '--:--';
  const slt = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  const h = slt.getUTCHours();
  const m = slt.getUTCMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return String(h12).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ' ' + ampm;
}

// ============================================================
// Main Kendara Screen
// ============================================================

export default function KendaraScreen() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();

  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const hasBirthData = user && user.birthData && user.birthData.dateTime;

  const fetchBirthChart = useCallback(async () => {
    if (!hasBirthData) { setChartData(null); return; }
    try {
      setLoading(true);
      setError(null);
      const bd = user.birthData;
      const lat = bd.lat || 6.9271;
      const lng = bd.lng || 79.8612;
      const res = await api.getBirthChart(bd.dateTime, lat, lng);
      if (res.success) {
        setChartData(res.data);
      } else {
        throw new Error(res.error || 'Failed to calculate chart');
      }
    } catch (err) {
      setError(err.message || t('failedToLoadChart'));
    } finally {
      setLoading(false);
    }
  }, [hasBirthData, user, t]);

  useEffect(() => { fetchBirthChart(); }, [fetchBirthChart]);
  const onRefresh = useCallback(() => { fetchBirthChart(); }, [fetchBirthChart]);

  const renderContent = () => {
    if (!hasBirthData) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="planet-outline" size={64} color="rgba(251,191,36,0.5)" />
          <Text style={styles.emptyTitle}>{t('birthDataMissing') || 'Birth Details Needed'}</Text>
          <Text style={styles.emptyText}>{t('setBirthDataPrompt')}</Text>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)/profile')}>
            <Text style={styles.actionButtonText}>{t('goToProfile') || 'Go to Profile'}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (loading && !chartData) {
      return <View style={styles.center}><ActivityIndicator size="large" color="#fbbf24" /></View>;
    }

    if (error) {
      return (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchBirthChart}>
            <Text style={{ color: '#fbbf24', marginTop: 10 }}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!chartData) return null;

    const lagnaRashiId = chartData.lagna ? (chartData.lagna.rashiId || chartData.lagna.id || 1) : 1;

    return (
      <View style={styles.chartContainer}>
        <View style={styles.headerRow}>
          <Ionicons name="grid-outline" size={20} color="#fbbf24" />
          <Text style={styles.sectionTitle}>
            {language === 'si' ? '\u0DBB\u0DCF\u0DC1\u0DD2 \u0D9A\u0DDA\u0DB1\u0DCA\u0DAF\u0DCA\u200D\u0DBB\u0DBA' : 'Rashi Kendara'}
          </Text>
        </View>

        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <SriLankanChart
            rashiChart={chartData.rashiChart}
            lagnaRashiId={lagnaRashiId}
            language={language}
          />
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>{t('chart_details') || 'Chart Details'}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('lagna') || 'Lagna'}:</Text>
            <Text style={styles.infoValue}>
              {language === 'si'
                ? (chartData.lagna && (chartData.lagna.sinhala || chartData.lagna.name))
                : (chartData.lagna && (chartData.lagna.english || chartData.lagna.name))}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('nakshatra') || 'Nakshatra'}:</Text>
            <Text style={styles.infoValue}>
              {(chartData.panchanga && chartData.panchanga.nakshatra && chartData.panchanga.nakshatra.name) ||
               (chartData.nakshatra && chartData.nakshatra.name) || '--'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('tithi') || 'Tithi'}:</Text>
            <Text style={styles.infoValue}>
              {(chartData.panchanga && chartData.panchanga.tithi && chartData.panchanga.tithi.name) || '--'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{language === 'si' ? '\u0DA0\u0DB1\u0DCA\u0DAF\u0DCA\u200D\u0DBB \u0DBB\u0DCF\u0DC1\u0DD2\u0DBA' : 'Moon Sign'}:</Text>
            <Text style={styles.infoValue}>
              {language === 'si'
                ? (chartData.moonSign && (chartData.moonSign.sinhala || chartData.moonSign.name))
                : (chartData.moonSign && (chartData.moonSign.english || chartData.moonSign.name))}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{language === 'si' ? '\u0DC3\u0DD6\u0DBB\u0DCA\u0DBA \u0DBB\u0DCF\u0DC1\u0DD2\u0DBA' : 'Sun Sign'}:</Text>
            <Text style={styles.infoValue}>
              {language === 'si'
                ? (chartData.sunSign && (chartData.sunSign.sinhala || chartData.sunSign.name))
                : (chartData.sunSign && (chartData.sunSign.english || chartData.sunSign.name))}
            </Text>
          </View>
        </View>

        <View style={[styles.detailsCard, { marginTop: 12 }]}>
          <Text style={styles.cardTitle}>
            {language === 'si' ? '\u0D9C\u0DCA\u200D\u0DBB\u0DC4 \u0DC3\u0DCA\u0DAE\u0DCF\u0DB1' : 'Planet Positions'}
          </Text>
          {chartData.rashiChart && chartData.rashiChart.map(function(entry) {
            if (!entry.planets || entry.planets.length === 0) return null;
            return entry.planets
              .filter(function(p) { return p.name !== 'Lagna' && p.name !== 'Ascendant'; })
              .map(function(p, idx) {
                var info = PLANET_INFO[p.name];
                var pLabel = info ? (language === 'si' ? info.si : p.name) : p.name;
                var rashiLabel = language === 'si'
                  ? (RASHI_SI[entry.rashiId] || entry.rashi)
                  : (entry.rashiEnglish || entry.rashi);
                return (
                  <View key={entry.rashiId + '-' + idx} style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: info ? info.color : '#fff' }]}>
                      {pLabel}
                    </Text>
                    <Text style={styles.infoValue}>
                      {rashiLabel} {p.degree != null ? formatDegree(p.degree) : ''}
                    </Text>
                  </View>
                );
              });
          })}
        </View>

        {(chartData.navamsaChart || chartData.navamshaChart) ? (
          <View style={{ marginTop: 20 }}>
            <View style={styles.headerRow}>
              <Ionicons name="apps-outline" size={20} color="#fbbf24" />
              <Text style={styles.sectionTitle}>
                {language === 'si' ? '\u0DB1\u0DC0\u0DCF\u0D82\u0DC1 \u0D9A\u0DDA\u0DB1\u0DCA\u0DAF\u0DCA\u200D\u0DBB\u0DBA' : 'Navamsa Chart'}
              </Text>
            </View>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <SriLankanChart
                rashiChart={chartData.navamsaChart || chartData.navamshaChart}
                lagnaRashiId={(chartData.navamshaLagna && chartData.navamshaLagna.rashi && chartData.navamshaLagna.rashi.id) || (chartData.navamsaLagna && chartData.navamsaLagna.rashi && chartData.navamsaLagna.rashi.id) || lagnaRashiId}
                language={language}
              />
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <CosmicBackground>
      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#fbbf24" />}>
        <View style={styles.content}>
          <Text style={styles.pageTitle}>
            {language === 'si' ? '\u0D94\u0DB6\u0D9C\u0DDA \u0D9A\u0DDA\u0DB1\u0DCA\u0DAF\u0DCA\u200D\u0DBB\u0DBA' : 'Your Horoscope'}
          </Text>
          <Text style={styles.pageSubtitle}>
            {user && user.birthData && user.birthData.dateTime
              ? new Date(user.birthData.dateTime).toLocaleDateString() + '  ' + toSLT(user.birthData.dateTime)
              : ''}
          </Text>
          {renderContent()}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 60 },
  pageTitle: { fontSize: 28, fontWeight: 'bold', color: '#fbbf24', marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 24 },
  center: { alignItems: 'center', justifyContent: 'center', height: 300 },
  emptyState: { alignItems: 'center', padding: 40, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20 },
  emptyTitle: { color: '#fbbf24', fontSize: 18, marginVertical: 16 },
  emptyText: { color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 20 },
  actionButton: { backgroundColor: '#fbbf24', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  actionButtonText: { fontWeight: 'bold' },
  errorText: { color: '#ef4444' },
  chartContainer: { marginBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: '#fff', fontSize: 18, marginLeft: 10, fontWeight: '600' },
  detailsCard: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, marginTop: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  infoLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  infoValue: { color: '#fff', fontWeight: '500', fontSize: 14 },
  cardTitle: { color: '#fbbf24', marginBottom: 12, fontWeight: '600' },
});
