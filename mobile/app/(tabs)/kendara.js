import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Platform, ActivityIndicator, Dimensions, Modal, FlatList
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import CosmicBackground from '../../components/CosmicBackground';
import { useLanguage } from '../../contexts/LanguageContext';
import api from '../../services/api';

const { width: SCREEN_W } = Dimensions.get('window');
const IS_SMALL = SCREEN_W < 380;

// Data Helpers
function transformVargaToHouses(vargaType, shadvargaData) {
    if (!shadvargaData || !shadvargaData.Lagna) return [];
    const lagnaRashiId = shadvargaData['Lagna'][vargaType];
    const houses = [];
    for (let i = 0; i < 12; i++) {
        const currentRashiId = ((lagnaRashiId - 1 + i) % 12) + 1;
        const planetsInHouse = [];
        Object.keys(shadvargaData).forEach(key => {
            if (key === 'Lagna') return;
            const pVarg = shadvargaData[key];
            if (pVarg && pVarg[vargaType] === currentRashiId) {
                planetsInHouse.push({
                   name: key.charAt(0).toUpperCase() + key.slice(1),
                   rashiId: currentRashiId
                });
            }
        });
        houses.push({ houseNumber: i + 1, rashiId: currentRashiId, planets: planetsInHouse });
    }
    return { houses, lagnaRashiId };
}

// Constants
var RASHI_NAMES = [
  '', 'Mesha', 'Vrishabha', 'Mithuna', 'Kataka',
  'Simha', 'Kanya', 'Thula', 'Vrischika',
  'Dhanu', 'Makara', 'Kumbha', 'Meena'
];

var RASHI_SYMBOLS = [
  '', '\u2648', '\u2649', '\u264A', '\u264B',
  '\u264C', '\u264D', '\u264E', '\u264F',
  '\u2650', '\u2651', '\u2652', '\u2653'
];

var PLANET_DISPLAY = {
  'Surya':     { si: 'රවි',      en: 'Sun',     symbol: '\u2609', color: '#fbbf24' },
  'Chandra':   { si: 'චන්ද්‍ර',  en: 'Moon',    symbol: '\u263D', color: '#c7d2fe' },
  'Mangala':   { si: 'කුජ',     en: 'Mars',    symbol: '\u2642', color: '#f87171' },
  'Budha':     { si: 'බුධ',     en: 'Mercury', symbol: '\u263F', color: '#6ee7b7' },
  'Guru':      { si: 'ගුරු',     en: 'Jupiter', symbol: '\u2643', color: '#fbbf24' },
  'Shukra':    { si: 'සිකුරු',  en: 'Venus',   symbol: '\u2640', color: '#f9a8d4' },
  'Shani':     { si: 'ශනි',     en: 'Saturn',  symbol: '\u2644', color: '#a5b4fc' },
  'Rahu':      { si: 'රාහු',       en: 'Rahu',    symbol: '\u260A', color: '#94a3b8' },
  'Ketu':      { si: 'කේතු',       en: 'Ketu',    symbol: '\u260B', color: '#c4b5fd' },
  'Lagna':     { si: 'ලග්න',    en: 'Asc',     symbol: 'Lg', color: '#fbbf24' },
  'Ascendant': { si: 'ලග්න',    en: 'Asc',     symbol: 'Lg', color: '#fbbf24' },
  'Sun':       { si: 'රවි',           en: 'Sun',     symbol: '\u2609', color: '#fbbf24' },
  'Moon':      { si: 'චන්ද්‍ර',        en: 'Moon',    symbol: '\u263D', color: '#c7d2fe' },
  'Mars':      { si: 'කුජ',           en: 'Mars',    symbol: '\u2642', color: '#f87171' },
  'Mercury':   { si: 'බුධ',          en: 'Mercury', symbol: '\u263F', color: '#6ee7b7' },
  'Jupiter':   { si: 'ගුරු',           en: 'Jupiter', symbol: '\u2643', color: '#fbbf24' },
  'Venus':     { si: 'සිකුරු',         en: 'Venus',   symbol: '\u2640', color: '#f9a8d4' },
  'Saturn':    { si: 'ශනි',          en: 'Saturn',  symbol: '\u2644', color: '#a5b4fc' },
};

var PLANET_SHORT = {
  'Surya': { si: 'රවි', en: 'Su' }, 'Chandra': { si: 'චන්ද්‍ර', en: 'Mo' },
  'Mangala': { si: 'කුජ', en: 'Ma' }, 'Budha': { si: 'බුධ', en: 'Me' },
  'Guru': { si: 'ගුරු', en: 'Ju' }, 'Shukra': { si: 'සිකුරු', en: 'Ve' },
  'Shani': { si: 'ශනි', en: 'Sa' }, 'Rahu': { si: 'රාහු', en: 'Ra' },
  'Ketu': { si: 'කේතු', en: 'Ke' }, 'Lagna': { si: 'ලග්න', en: 'As' },
  'Ascendant': { si: 'ලග්න', en: 'As' },
  'Sun': { si: 'රවි', en: 'Su' }, 'Moon': { si: 'චන්ද්‍ර', en: 'Mo' },
  'Mars': { si: 'කුජ', en: 'Ma' }, 'Mercury': { si: 'බුධ', en: 'Me' },
  'Jupiter': { si: 'ගුරු', en: 'Ju' }, 'Venus': { si: 'සිකුරු', en: 'Ve' },
  'Saturn': { si: 'ශනි', en: 'Sa' },
};

var RASHI_SI = [
  '', 'මේෂ', 'වෘෂභ', 'මිථුන', 'කටක',
  'සිංහ', 'කන්‍යා', 'තුලා', 'වෘශ්චික',
  'ධනු', 'මකර', 'කුම්භ', 'මීන'
];

const SRI_LANKAN_CITIES = [
  { name: 'Colombo', lat: '6.9271', lng: '79.8612' },
  { name: 'Kandy', lat: '7.2906', lng: '80.6337' },
  { name: 'Galle', lat: '6.0535', lng: '80.2210' },
  { name: 'Jaffna', lat: '9.6615', lng: '80.0255' },
  { name: 'Matara', lat: '5.9549', lng: '80.5550' },
  { name: 'Anuradhapura', lat: '8.3114', lng: '80.4037' },
  { name: 'Trincomalee', lat: '8.5874', lng: '81.2152' },
  { name: 'Kurunegala', lat: '7.4863', lng: '80.3647' },
  { name: 'Ratnapura', lat: '6.7056', lng: '80.3847' },
  { name: 'Batticaloa', lat: '7.7310', lng: '81.6747' },
  { name: 'Badulla', lat: '6.9897', lng: '81.0557' },
  { name: 'Nuwara Eliya', lat: '6.9497', lng: '80.7891' },
  { name: 'Puttalam', lat: '8.0362', lng: '79.8283' },
  { name: 'Hambantota', lat: '6.1429', lng: '81.1185' },
  { name: 'Gampaha', lat: '7.0840', lng: '79.9939' }
];

// Helpers
function getPLabel(p, language) {
  var name = typeof p === 'string' ? p : (p.name || '');
  var entry = PLANET_SHORT[name];
  if (!entry) return name.substring(0, 2);
  return language === 'si' ? entry.si : entry.en;
}

function getPlanetColor(name) {
  var pName = typeof name === 'string' ? name : (name.name || '');
  var entry = PLANET_DISPLAY[pName];
  return entry ? entry.color : '#fff';
}

function getRashiName(rashiId, language) {
  if (language === 'si') return RASHI_SI[rashiId] || RASHI_NAMES[rashiId] || '';
  return RASHI_NAMES[rashiId] || '';
}

// Reusable UI Components
function GlassCard({ children, style, intensity = 'medium' }) {
  var opacities = {
    low: ['rgba(30, 10, 50, 0.3)', 'rgba(50, 20, 80, 0.4)'],
    medium: ['rgba(25, 15, 50, 0.65)', 'rgba(15, 8, 35, 0.85)'],
    high: ['rgba(15, 5, 30, 0.88)', 'rgba(8, 3, 18, 0.96)']
  };
  return (
    <View style={[gs.glassContainer, style]}>
      <LinearGradient colors={opacities[intensity]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <View style={gs.glassBorder} />
      {children}
    </View>
  );
}

var gs = StyleSheet.create({
  glassContainer: {
    borderRadius: 22, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.12)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35, shadowRadius: 24, elevation: 12,
    marginBottom: 20,
  },
  glassBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', borderRadius: 22
  }
});

function SectionHeader({ title, icon, color }) {
  var c = color || '#fbbf24';
  return (
    <View style={sty.sectionHeader}>
      <View style={[sty.iconBox, { backgroundColor: c + '18' }]}>
        <MaterialCommunityIcons name={icon} size={22} color={c} />
      </View>
      <Text style={[sty.sectionTitle, { color: c }]}>{title}</Text>
      <View style={sty.headerLine} />
    </View>
  );
}

function CitySelectorModal({ visible, onClose, onSelect }) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={sty.modalOverlay}>
        <View style={sty.modalContent}>
          <View style={sty.modalHeader}>
            <Text style={sty.modalTitle}>Select City</Text>
            <TouchableOpacity onPress={onClose} style={sty.closeBtn}>
              <Ionicons name="close-circle" size={34} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={SRI_LANKAN_CITIES}
            keyExtractor={function(item) { return item.name; }}
            showsVerticalScrollIndicator={false}
            renderItem={function({ item }) {
              return (
                <TouchableOpacity style={sty.cityItem} onPress={function() { onSelect(item); onClose(); }} activeOpacity={0.6}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <View style={sty.cityIconBg}>
                      <Ionicons name="location" size={20} color="#fbbf24" />
                    </View>
                    <Text style={sty.cityItemText}>{item.name}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.15)" />
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

// Chart Sub-Components

function PlanetPill({ name, language, small, isCompact }) {
  var pName = typeof name === 'string' ? name : (name.name || '');
  var color = getPlanetColor(pName);
  var displayInfo = PLANET_DISPLAY[pName];
  var label = getPLabel(name, language);
  var fs = isCompact ? 9 : (small ? 11 : 14);
  var px = isCompact ? 1 : (small ? 4 : 7);
  var py = isCompact ? 0 : (small ? 1 : 3);
  
  var showSymbol = isCompact && language !== 'si';
  var text = showSymbol ? (displayInfo ? displayInfo.symbol : label.substring(0,1)) : label;

  return (
    <View style={{
      backgroundColor: color + '22', borderRadius: 4,
      paddingHorizontal: px, paddingVertical: py,
      borderWidth: 1, borderColor: color + '40',
      margin: 1
    }}>
      <Text style={{ fontSize: fs, fontWeight: '800', color: color, textAlign: 'center' }}>{text}</Text>
    </View>
  );
}

function getHouseData(houses, houseNum) {
  if (!houses) return { rashiId: houseNum, planets: [], hasLagna: false };
  var house = houses[houseNum - 1];
  if (!house) return { rashiId: houseNum, planets: [], hasLagna: false };
  var rashiId = house.rashiId || house.rashi || houseNum;
  var allPlanets = house.planets || [];
  var planets = allPlanets.filter(function(p) {
    var n = typeof p === 'string' ? p : (p.name || '');
    return n !== 'Lagna' && n !== 'Ascendant';
  });
  var hasLagna = houseNum === 1 || allPlanets.some(function(p) {
    var n = typeof p === 'string' ? p : (p.name || '');
    return n === 'Lagna' || n === 'Ascendant';
  });
  return { rashiId, planets, hasLagna };
}

function SideCell({ houseNum, data, language, w, h, isCompact }) {
  var rashi = getRashiName(data.rashiId, language);
  return (
    <View style={{
      width: w, height: h,
      borderWidth: 0.5, borderColor: 'rgba(251,191,36,0.22)',
      backgroundColor: data.hasLagna ? 'rgba(251,191,36,0.05)' : 'rgba(10,3,30,0.4)',
      alignItems: 'center', justifyContent: 'center', padding: isCompact ? 2 : 4,
    }}>
      <Text style={{ position: 'absolute', top: 2, left: 4, fontSize: isCompact ? 8 : 9, color: 'rgba(251,191,36,0.3)', fontWeight: '700' }}>{houseNum}</Text>
      {!isCompact && <Text style={{ position: 'absolute', top: 4, right: 5, fontSize: 9, color: 'rgba(251,191,36,0.45)', fontWeight: '600' }} numberOfLines={1}>{rashi}</Text>}
      <View style={{ alignItems: 'center', justifyContent: 'center', gap: isCompact ? 1 : 4, marginTop: isCompact ? 6 : 10 }}>
        {data.hasLagna && (
          <View style={{ backgroundColor: '#fbbf24', borderRadius: 4, paddingHorizontal: isCompact ? 4 : 8, paddingVertical: isCompact ? 1 : 3 }}>
            <Text style={{ fontSize: isCompact ? 8 : 11, fontWeight: '900', color: '#0d0520' }}>{language === 'si' ? 'ලග්න' : 'ASC'}</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: isCompact ? 1 : 3 }}>
          {data.planets.length > 0 ? data.planets.map(function(p, i) {
            return <PlanetPill key={i} name={p} language={language} small={false} isCompact={isCompact} />;
          }) : (
            !data.hasLagna && <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.06)' }}>{'\u00B7'}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

function CornerCell({ upperNum, lowerNum, upperData, lowerData, language, size, diagType, isCompact }) {
  var isBackslash = diagType === 'tl' || diagType === 'br';
  var lineRotation = isBackslash ? '-45deg' : '45deg';
  var diagLen = size * 1.42;

  var upperPos, lowerPos;
  if (isBackslash) {
    upperPos = { top: 2, right: 2, alignItems: 'flex-end', paddingTop: 1, paddingRight: 4 };
    lowerPos = { bottom: 2, left: 2, alignItems: 'flex-start', paddingBottom: 1, paddingLeft: 4 };
  } else {
    upperPos = { top: 2, left: 2, alignItems: 'flex-start', paddingTop: 1, paddingLeft: 4 };
    lowerPos = { bottom: 2, right: 2, alignItems: 'flex-end', paddingBottom: 1, paddingRight: 4 };
  }

  return (
    <View style={{
      width: size, height: size,
      borderWidth: 0.5, borderColor: 'rgba(251,191,36,0.22)',
      backgroundColor: 'rgba(10,3,30,0.4)', overflow: 'hidden',
    }}>
      <View pointerEvents="none" style={{
        position: 'absolute', width: diagLen, height: 1.5,
        backgroundColor: 'rgba(251,191,36,0.28)',
        top: size / 2 - 0.75, left: (size - diagLen) / 2,
        transform: [{ rotate: lineRotation }],
      }} />
      <TriContent num={upperNum} data={upperData} posStyle={upperPos} language={language} size={size} isCompact={isCompact} />
      <TriContent num={lowerNum} data={lowerData} posStyle={lowerPos} language={language} size={size} isCompact={isCompact} />
    </View>
  );
}

function TriContent({ num, data, posStyle, language, size, isCompact }) {
  var rashi = getRashiName(data.rashiId, language);
  return (
    <View style={[{ position: 'absolute', width: size * 0.58, height: size * 0.52, justifyContent: 'center' }, posStyle]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 1 }}>
        <Text style={{ fontSize: isCompact ? 7 : 8, color: 'rgba(251,191,36,0.35)', fontWeight: '800' }}>{num}</Text>
        {!isCompact && <Text style={{ fontSize: 8, color: 'rgba(251,191,36,0.45)', fontWeight: '600' }} numberOfLines={1}>{rashi}</Text>}
      </View>
      <View style={{ gap: 1 }}>
        {data.hasLagna && (
          <View style={{ backgroundColor: '#fbbf24', borderRadius: 2, paddingHorizontal: 3, paddingVertical: 1, alignSelf: 'flex-start' }}>
            <Text style={{ fontSize: isCompact ? 7 : 9, fontWeight: '900', color: '#0d0520' }}>{language === 'si' ? 'ලග්න' : 'ASC'}</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
          {data.planets.map(function(p, i) { return <PlanetPill key={i} name={p} language={language} small isCompact={isCompact} />; })}
        </View>
      </View>
    </View>
  );
}

function CenterCell({ size, lagna, language, isCompact }) {
  var lagnaName = '';
  if (lagna) {
    lagnaName = language === 'si'
      ? (lagna.rashiSinhala || lagna.sinhala || RASHI_SI[lagna.rashiId] || '')
      : (lagna.english || RASHI_NAMES[lagna.rashiId] || lagna.name || '');
  }
  return (
    <View style={{
      width: size, height: size,
      borderWidth: 0.5, borderColor: 'rgba(251,191,36,0.22)',
      backgroundColor: '#080218', alignItems: 'center', justifyContent: 'center',
    }}>
      <View style={{
        width: size * 0.46, height: size * 0.46, borderRadius: size,
        backgroundColor: 'rgba(251,191,36,0.04)',
        borderWidth: 1.5, borderColor: 'rgba(251,191,36,0.12)',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{
          fontSize: size * 0.24, color: '#fbbf24', fontWeight: 'bold', opacity: 0.75,
          textShadowColor: 'rgba(251,191,36,0.3)', textShadowRadius: 16,
        }}>{'\u0950'}</Text>
      </View>
      {!isCompact && lagnaName ? (
        <Text style={{ fontSize: 12, color: '#fbbf24', fontWeight: '700', textAlign: 'center', marginTop: 4, opacity: 0.85 }} numberOfLines={1}>{lagnaName}</Text>
      ) : null}
      {!isCompact && lagna && lagna.degree !== undefined ? (
        <Text style={{ fontSize: 10, color: 'rgba(251,191,36,0.35)', marginTop: 1 }}>{lagna.degree.toFixed(1) + '\u00B0'}</Text>
      ) : null}
    </View>
  );
}

// Main Chart Grid (3x3)
function KendaraBox({ houses, label, lagna, sizeW, hideLegend }) {
  var ctx = useLanguage();
  var t = ctx.t;
  var language = ctx.language;
  var CHART_W = sizeW || (SCREEN_W - 44);
  var CELL = Math.floor(CHART_W / 3);
  var isCompact = CHART_W < 200;
  var gd = function(n) { return getHouseData(houses, n); };

  return (
    <View style={sty.srChart}>
      <View style={sty.chartLabelRow}>
        <View style={sty.chartLabelLine} />
        <Text style={[sty.chartTitle, isCompact && { fontSize: 10, letterSpacing: 1 }]}>{label || t('rashiChart')}</Text>
        <View style={sty.chartLabelLine} />
      </View>

      <View style={{
        width: CELL * 3 + 4, borderWidth: 2,
        borderColor: 'rgba(251,191,36,0.4)',
        backgroundColor: '#080218', borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#fbbf24', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12, shadowRadius: 12, elevation: 8,
      }}>
        <View style={{ flexDirection: 'row' }}>
          <CornerCell upperNum={2} lowerNum={3} upperData={gd(2)} lowerData={gd(3)} language={language} size={CELL} diagType="tl" isCompact={isCompact} />
          <SideCell houseNum={1} data={gd(1)} language={language} w={CELL} h={CELL} isCompact={isCompact} />
          <CornerCell upperNum={12} lowerNum={11} upperData={gd(12)} lowerData={gd(11)} language={language} size={CELL} diagType="tr" isCompact={isCompact} />
        </View>
        <View style={{ flexDirection: 'row' }}>
          <SideCell houseNum={4} data={gd(4)} language={language} w={CELL} h={CELL} isCompact={isCompact} />
          <CenterCell size={CELL} lagna={lagna} language={language} isCompact={isCompact} />
          <SideCell houseNum={10} data={gd(10)} language={language} w={CELL} h={CELL} isCompact={isCompact} />
        </View>
        <View style={{ flexDirection: 'row' }}>
          <CornerCell upperNum={5} lowerNum={6} upperData={gd(5)} lowerData={gd(6)} language={language} size={CELL} diagType="bl" isCompact={isCompact} />
          <SideCell houseNum={7} data={gd(7)} language={language} w={CELL} h={CELL} isCompact={isCompact} />
          <CornerCell upperNum={8} lowerNum={9} upperData={gd(8)} lowerData={gd(9)} language={language} size={CELL} diagType="br" isCompact={isCompact} />
        </View>
      </View>

      {!hideLegend && (
        <View style={sty.legendBox}>
          <Text style={sty.legendTitle}>Legend:</Text>
          <View style={sty.legendRow}>
            {['Surya','Chandra','Mangala','Budha','Guru','Shukra','Shani','Rahu','Ketu'].map(function(name) {
              var info = PLANET_DISPLAY[name];
              var shortLabel = language === 'si' ? PLANET_SHORT[name].si : PLANET_SHORT[name].en;
              return (
                <View key={name} style={sty.legendItem}>
                  <View style={[sty.legendDot, { backgroundColor: info.color }]} />
                  <Text style={[sty.legendLabel, { color: info.color }]}>{shortLabel}</Text>
                  <Text style={sty.legendName}>{info.en}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

// Planet Info Card
function PlanetCard({ planet, language, t }) {
  var name = typeof planet === 'string' ? planet : (planet.name || 'Planet');
  var info = PLANET_DISPLAY[name] || {};
  var rashi = typeof planet === 'object' && planet.rashiId
    ? getRashiName(planet.rashiId, language) : '';
  var deg = typeof planet === 'object' && planet.degree !== undefined
    ? planet.degree.toFixed(2) + '\u00B0' : '';
  var displayName = language === 'si' ? (info.si || name) : (info.en || name);
  var color = info.color || '#fff';

  return (
    <View style={sty.planetCard}>
      <View style={[sty.planetCircle, { borderColor: color, backgroundColor: color + '12' }]}>
        <Text style={[sty.planetCircleText, { color: color }]}>{language === 'si' ? displayName : (info.symbol || '?')}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[sty.planetName, { color: color }]}>{displayName}</Text>
        {rashi ? <Text style={sty.planetRashi}>{rashi}</Text> : null}
      </View>
      {deg ? (
        <View style={sty.degreePill}>
          <Text style={sty.degreeText}>{deg}</Text>
        </View>
      ) : null}
    </View>
  );
}

// Secret Row helper
function SecretRow({ label, hint, value, sub, last }) {
  return (
    <View style={[sty.secretRow, last && { borderBottomWidth: 0 }]}>
      <View style={{ flex: 1 }}>
        <Text style={sty.secretLabel}>{label}</Text>
        <Text style={sty.secretHint}>{hint}</Text>
      </View>
      <Text style={sty.secretValue}>{value}{'\n'}<Text style={{ fontSize: 12, opacity: 0.55 }}>({sub})</Text></Text>
    </View>
  );
}

// MAIN SCREEN
export default function KendaraScreen() {
  var ctx = useLanguage();
  var t = ctx.t;
  var language = ctx.language;
  var _bd = useState('1990-01-15'); var birthDate = _bd[0]; var setBirthDate = _bd[1];
  var _bt = useState('06:30'); var birthTime = _bt[0]; var setBirthTime = _bt[1];
  var _la = useState('6.9271'); var lat = _la[0]; var setLat = _la[1];
  var _ln = useState('79.8612'); var lng = _ln[0]; var setLng = _ln[1];
  var _da = useState(null); var data = _da[0]; var setData = _da[1];
  var _lo = useState(false); var loading = _lo[0]; var setLoading = _lo[1];
  var _er = useState(null); var error = _er[0]; var setError = _er[1];
  var _ti = useState(0); var tabIndex = _ti[0]; var setTabIndex = _ti[1];
  var _cm = useState(false); var cityModalVisible = _cm[0]; var setCityModalVisible = _cm[1];

  var generate = useCallback(async function() {
    try {
      setLoading(true); setError(null);
      var dtStr = birthDate + 'T' + birthTime + ':00';
      var dataRes = await api.getBirthChartData(dtStr, parseFloat(lat), parseFloat(lng));
      setData(dataRes.data);
    } catch (err) {
      setError(err.message || t('failedToDrawMap'));
    } finally {
      setLoading(false);
    }
  }, [birthDate, birthTime, lat, lng, t]);

  var handleCitySelect = function(city) { setLat(city.lat); setLng(city.lng); };

  var TABS = [
    { key: 'chart', icon: 'apps-outline', label: language === 'si' ? 'සටහන' : 'Chart' },
    { key: 'planets', icon: 'planet-outline', label: language === 'si' ? 'ග්‍රහ' : 'Planets' },
    { key: 'report', icon: 'document-text-outline', label: language === 'si' ? 'වාර්තාව' : 'Report' },
  ];

  return (
    <CosmicBackground>
      <ScrollView style={sty.flex} contentContainerStyle={sty.scrollContent} showsVerticalScrollIndicator={false}>

        <Animated.View entering={FadeInDown.delay(100).duration(700)}>
          <View style={sty.headerArea}>
            <Text style={sty.headerEmoji}>{'\uD83D\uDD2E'}</Text>
            <Text style={sty.headerTitle}>{t('mysticChart')}</Text>
            <Text style={sty.headerSub}>{t('unveilBlueprint')}</Text>
          </View>
        </Animated.View>

        {!data && (
          <Animated.View entering={FadeInDown.delay(200).duration(700)}>
            <GlassCard intensity="high">
              <View style={sty.formBody}>
                <View style={sty.formTitleRow}>
                  <Ionicons name="sparkles" size={24} color="#fbbf24" />
                  <Text style={sty.formTitle}>{t('enterBirthDetails')}</Text>
                </View>

                <View style={sty.inputRow}>
                  <View style={sty.inputGroup}>
                    <Text style={sty.inputLabel}>{t('dateOfBirth')}</Text>
                    <View style={sty.inputBox}>
                      <TextInput style={sty.input} value={birthDate} onChangeText={setBirthDate}
                        placeholder="YYYY-MM-DD" placeholderTextColor="rgba(255,255,255,0.2)" />
                    </View>
                  </View>
                  <View style={sty.inputGroup}>
                    <Text style={sty.inputLabel}>{t('timeOfBirth')}</Text>
                    <View style={sty.inputBox}>
                      <TextInput style={sty.input} value={birthTime} onChangeText={setBirthTime}
                        placeholder="HH:MM" placeholderTextColor="rgba(255,255,255,0.2)" />
                    </View>
                  </View>
                </View>

                <View style={{ marginTop: 8 }}>
                  <Text style={sty.inputLabel}>{t('birthLocation') || 'Birth Location'}</Text>
                  <TouchableOpacity style={sty.cityBtn} onPress={function() { setCityModalVisible(true); }} activeOpacity={0.7}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                      <View style={sty.cityDot}>
                        <Ionicons name="location" size={22} color="#fbbf24" />
                      </View>
                      <View>
                        <Text style={sty.cityName}>{(SRI_LANKAN_CITIES.find(function(c) { return c.lat === lat && c.lng === lng; }) || {}).name || 'Custom'}</Text>
                        <Text style={sty.cityCoords}>{parseFloat(lat).toFixed(4) + '\u00B0N, ' + parseFloat(lng).toFixed(4) + '\u00B0E'}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-down" size={22} color="rgba(255,255,255,0.25)" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={sty.ctaBtn} onPress={generate} disabled={loading} activeOpacity={0.8}>
                  <LinearGradient colors={['#92400e', '#d97706', '#fbbf24', '#d97706', '#92400e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                  <View style={sty.ctaInner}>
                    {loading ? <ActivityIndicator color="#fff" size="small" /> : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <MaterialCommunityIcons name="star-four-points" size={24} color="#fff" />
                        <Text style={sty.ctaText}>{t('illuminateChart')}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {error && (
          <GlassCard style={{ borderColor: '#ef4444', padding: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <Ionicons name="alert-circle" size={28} color="#ef4444" />
              <Text style={sty.errorText}>{error}</Text>
            </View>
          </GlassCard>
        )}

        {data && !loading && (
          <View>
            {data.lagna && (
              <Animated.View entering={FadeInDown.delay(200).duration(700)}>
                <GlassCard intensity="high">
                  <LinearGradient colors={['rgba(251,191,36,0.06)', 'transparent']} style={StyleSheet.absoluteFill} />
                  <View style={sty.heroCard}>
                    <View style={{ flex: 1, paddingRight: 16 }}>
                      <Text style={sty.heroLabel}>{t('ascendantLagna')}</Text>
                      <Text style={sty.heroValue}>
                        {language === 'si'
                          ? (RASHI_SI[data.lagna.rashiId] || '')
                          : (RASHI_NAMES[data.lagna.rashiId] ? t(RASHI_NAMES[data.lagna.rashiId].toLowerCase()) : '')}
                      </Text>
                      <Text style={sty.heroDetail}>
                        {(function() {
                          var lordName = data.lagna.lord || '';
                          if (language === 'si') {
                            var lordInfo = PLANET_DISPLAY[lordName];
                            lordName = lordInfo ? lordInfo.si : lordName;
                          }
                          var deg = data.lagna.degree !== undefined ? data.lagna.degree.toFixed(2) : '';
                          return t('lord') + ': ' + lordName + '  \u2022  ' + deg + '\u00B0';
                        })()}
                      </Text>
                    </View>
                    <View style={sty.heroSymbolBox}>
                      <Text style={sty.heroSymbol}>{RASHI_SYMBOLS[data.lagna.rashiId]}</Text>
                    </View>
                  </View>
                </GlassCard>
              </Animated.View>
            )}

            <View style={sty.tabBar}>
              {TABS.map(function(tab, i) {
                return (
                  <TouchableOpacity key={tab.key} style={[sty.tab, tabIndex === i && sty.tabActive]} onPress={function() { setTabIndex(i); }} activeOpacity={0.7}>
                    <Ionicons name={tab.icon} size={20} color={tabIndex === i ? '#fbbf24' : 'rgba(255,255,255,0.3)'} />
                    <Text style={[sty.tabLabel, tabIndex === i && sty.tabLabelActive]}>{tab.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {tabIndex === 0 && (
              <Animated.View entering={FadeInDown.duration(400)}>
                {data.shadvarga ? (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <View style={{ width: (SCREEN_W - 48) / 2 }}>
                      <KendaraBox houses={data.houseChart || data.rashiChart} label={language === 'si' ? 'රාශි (D1)' : 'RASHI (D1)'} lagna={data.lagna} sizeW={(SCREEN_W - 48) / 2} hideLegend={true} />
                    </View>
                    <View style={{ width: (SCREEN_W - 48) / 2 }}>
                      {(function() {
                        var d9 = transformVargaToHouses('D9', data.shadvarga);
                        return (
                          <KendaraBox houses={d9.houses} label={language === 'si' ? 'නවාංශක (D9)' : 'NAVAMSHA (D9)'}
                            lagna={{ rashiId: d9.lagnaRashiId, name: 'Lagna', sinhala: 'ලග්න', rashiSinhala: 'ලග්න' }} sizeW={(SCREEN_W - 48) / 2} hideLegend={true} />
                        );
                      })()}
                    </View>
                  </View>
                ) : (
                  <KendaraBox houses={data.houseChart || data.rashiChart} label={language === 'si' ? 'RASHI CHART (D1)' : 'RASHI CHART (D1)'} lagna={data.lagna} hideLegend={true} />
                )}

                <View style={[sty.legendBox, { marginBottom: 24, backgroundColor: 'rgba(0,0,0,0.4)', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }]}>
                  <Text style={[sty.legendTitle, { marginBottom: 10, fontSize: 12 }]}>{language === 'si' ? 'ග්‍රහ සටහන' : 'Planetary Legend'}</Text>
                  <View style={sty.legendRow}>
                    {['Surya','Chandra','Mangala','Budha','Guru','Shukra','Shani','Rahu','Ketu'].map(function(name) {
                      var info = PLANET_DISPLAY[name];
                      var shortLabel = language === 'si' ? PLANET_SHORT[name].si : PLANET_SHORT[name].en;
                      return (
                        <View key={name} style={[sty.legendItem, { paddingHorizontal: 4, paddingVertical: 2 }]}>
                          <View style={[sty.legendDot, { backgroundColor: info.color }]} />
                          <Text style={[sty.legendLabel, { color: info.color }]}>{info.symbol} {shortLabel}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {data.specialLords && (
                  <GlassCard>
                    <SectionHeader title={language === 'si' ? 'විශේෂ කරුණු' : 'Astral Secrets'} icon="eye-circle-outline" color="#f472b6" />
                    <View style={{ padding: 20 }}>
                      <SecretRow label="22nd Drekkana Lord" hint="Hidden enemies & dangers"
                        value={data.specialLords.lord22Derkana} sub={data.specialLords.rashi22Derkana} />
                      <SecretRow label="64th Navamsha Lord" hint="Karmic debt"
                        value={data.specialLords.lord64Navamsha} sub={data.specialLords.rashi64Navamsha} />
                      <SecretRow label="Badhaka Lord" hint="Life obstacles"
                        value={data.specialLords.badhakaLord} sub={data.specialLords.badhakaRashi} last />
                    </View>
                  </GlassCard>
                )}
              </Animated.View>
            )}

            {tabIndex === 1 && (
              <Animated.View entering={FadeInDown.duration(400)}>
                <GlassCard>
                  <SectionHeader title={t('celestialPositions')} icon="orbit" />
                  <View style={{ padding: 16, gap: 10 }}>
                    {data.planets && data.planets.map(function(p, i) {
                      return <PlanetCard key={i} planet={p} language={language} t={t} />;
                    })}
                  </View>
                </GlassCard>

                {data.shadvarga && (
                  <GlassCard>
                    <SectionHeader title={language === 'si' ? 'ෂඩ්වර්ග' : 'Shadvarga'} icon="table-large" color="#60a5fa" />
                    <View style={sty.tableHeader}>
                      <Text style={[sty.th, { flex: 2 }]}>{language === 'si' ? 'ග්‍රහයා' : 'Planet'}</Text>
                      <Text style={[sty.th, { flex: 1 }]}>D1</Text>
                      <Text style={[sty.th, { flex: 1 }]}>D2</Text>
                      <Text style={[sty.th, { flex: 1 }]}>D3</Text>
                      <Text style={[sty.th, { flex: 1 }]}>D9</Text>
                    </View>
                    {Object.keys(data.shadvarga).filter(function(k) { return k !== 'Lagna'; }).map(function(name, i) {
                      var v = data.shadvarga[name];
                      var capName = name.charAt(0).toUpperCase() + name.slice(1);
                      var displayInfo = PLANET_DISPLAY[capName];
                      var displayName = displayInfo ? (language === 'si' ? displayInfo.si : displayInfo.en) : capName;
                      return (
                        <View key={i} style={sty.tableRow}>
                          <Text style={[sty.tCell, { flex: 2, color: getPlanetColor(capName), fontWeight: '700' }]}>{displayName}</Text>
                          <Text style={[sty.tCell, { flex: 1, textAlign: 'center' }]}>{(v && v.D1) || '-'}</Text>
                          <Text style={[sty.tCell, { flex: 1, textAlign: 'center' }]}>{(v && v.D2) || '-'}</Text>
                          <Text style={[sty.tCell, { flex: 1, textAlign: 'center' }]}>{(v && v.D3) || '-'}</Text>
                          <Text style={[sty.tCell, { flex: 1, textAlign: 'center' }]}>{(v && v.D9) || '-'}</Text>
                        </View>
                      );
                    })}
                  </GlassCard>
                )}
              </Animated.View>
            )}

            {tabIndex === 2 && (
              <Animated.View entering={FadeInDown.duration(400)}>
                {data.yogas && data.yogas.length > 0 && (
                  <GlassCard>
                    <SectionHeader title={t('divineYogas')} icon="star-four-points-outline" color="#34d399" />
                    {data.yogas.map(function(y, i) {
                      return (
                        <View key={i} style={sty.yogaCard}>
                          <Text style={sty.yogaName}>{'\u2726 ' + (y.name || y)}</Text>
                          {y.description && <Text style={sty.yogaDesc}>{y.description}</Text>}
                        </View>
                      );
                    })}
                  </GlassCard>
                )}

                {data.report && data.report.character && (
                  <GlassCard>
                    <SectionHeader title={t('character')} icon="account-star-outline" color="#a78bfa" />
                    <View style={sty.rBlock}><Text style={sty.rText}>{data.report.character}</Text></View>
                  </GlassCard>
                )}
                {data.report && data.report.marriage && (
                  <GlassCard>
                    <SectionHeader title={t('marriage')} icon="heart-multiple-outline" color="#f472b6" />
                    <View style={sty.rBlock}><Text style={sty.rText}>{data.report.marriage}</Text></View>
                  </GlassCard>
                )}
                {data.report && data.report.wealth && (
                  <GlassCard>
                    <SectionHeader title={t('wealthCareer')} icon="briefcase-variant-outline" color="#fcd34d" />
                    <View style={sty.rBlock}><Text style={sty.rText}>{data.report.wealth}</Text></View>
                  </GlassCard>
                )}
                {data.report && data.report.children && (
                  <GlassCard>
                    <SectionHeader title={t('children')} icon="baby-face-outline" color="#60a5fa" />
                    <View style={sty.rBlock}><Text style={sty.rText}>{data.report.children}</Text></View>
                  </GlassCard>
                )}
                {data.report && data.report.future && (
                  <GlassCard>
                    <SectionHeader title={t('futureInsights')} icon="crystal-ball" color="#c084fc" />
                    <View style={sty.rBlock}><Text style={sty.rText}>{data.report.future}</Text></View>
                  </GlassCard>
                )}
                {data.report && data.report.deepInsights && (
                  <GlassCard>
                    <SectionHeader title={t('deepInsights')} icon="lightbulb-on-outline" color="#2dd4bf" />
                    {Object.entries(data.report.deepInsights).map(function(entry, i) {
                      return (
                        <View key={i} style={sty.traitGroup}>
                          <Text style={sty.traitHead}>{t(entry[0])}</Text>
                          <Text style={sty.rText}>{entry[1]}</Text>
                        </View>
                      );
                    })}
                  </GlassCard>
                )}
                {data.dasaPeriods && (
                  <GlassCard>
                    <SectionHeader title="Dasa Timeline" icon="timeline-clock-outline" color="#fbbf24" />
                    <View style={sty.tableHeader}>
                      <Text style={[sty.th, { flex: 2 }]}>{t('period')}</Text>
                      <Text style={[sty.th, { flex: 2 }]}>{t('ruler')}</Text>
                      <Text style={[sty.th, { flex: 2, textAlign: 'right' }]}>{t('ends')}</Text>
                    </View>
                    {data.dasaPeriods.map(function(p, i) {
                      return (
                        <View key={i} style={[sty.tableRow, i === data.dasaPeriods.length - 1 && { borderBottomWidth: 0 }]}>
                          <Text style={[sty.tCellBold, { flex: 2 }]}>{p.type}</Text>
                          <Text style={[sty.tCell, { flex: 2, color: '#fbbf24' }]}>{p.lord}</Text>
                          <Text style={[sty.tCell, { flex: 2, textAlign: 'right' }]}>{p.endDate}</Text>
                        </View>
                      );
                    })}
                  </GlassCard>
                )}
                {!data.report && data.personality && (
                  <GlassCard>
                    <SectionHeader title={t('soulImprint')} icon="fingerprint" color="#a78bfa" />
                    {typeof data.personality === 'string' ? (
                      <View style={sty.rBlock}><Text style={sty.rText}>{data.personality}</Text></View>
                    ) : (
                      <View>
                        <View style={sty.traitGroup}><Text style={sty.traitHead}>Lagna (Body)</Text><Text style={sty.rText}>{data.personality.lagnaTraits}</Text></View>
                        <View style={sty.traitGroup}><Text style={sty.traitHead}>Moon (Mind)</Text><Text style={sty.rText}>{data.personality.moonTraits}</Text></View>
                        <View style={sty.traitGroup}><Text style={sty.traitHead}>Sun (Soul)</Text><Text style={sty.rText}>{data.personality.sunTraits}</Text></View>
                      </View>
                    )}
                  </GlassCard>
                )}
              </Animated.View>
            )}

            <TouchableOpacity style={sty.resetBtn} onPress={function() { setData(null); setTabIndex(0); }} activeOpacity={0.7}>
              <View style={sty.resetInner}>
                <Ionicons name="refresh" size={18} color="rgba(255,255,255,0.4)" />
                <Text style={sty.resetText}>Calculate Another Chart</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 130 }} />
      </ScrollView>

      <CitySelectorModal visible={cityModalVisible} onClose={function() { setCityModalVisible(false); }} onSelect={handleCitySelect} />
    </CosmicBackground>
  );
}

// STYLES
var sty = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 36 },

  headerArea: { alignItems: 'center', marginBottom: 28, paddingVertical: 12 },
  headerEmoji: { fontSize: 40, marginBottom: 8 },
  headerTitle: {
    fontSize: IS_SMALL ? 30 : 36, fontWeight: '900', color: '#fff',
    textAlign: 'center', letterSpacing: 0.5,
    textShadowColor: 'rgba(251,191,36,0.4)', textShadowRadius: 24,
  },
  headerSub: {
    fontSize: IS_SMALL ? 13 : 15, color: '#fbbf24', marginTop: 8,
    letterSpacing: 3, textTransform: 'uppercase', opacity: 0.7, textAlign: 'center',
  },

  formBody: { padding: IS_SMALL ? 22 : 28 },
  formTitleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 24, paddingBottom: 18,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  formTitle: { fontSize: IS_SMALL ? 19 : 23, fontWeight: '700', color: '#fff' },
  inputRow: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: IS_SMALL ? 14 : 16, color: '#c4b5fd', marginBottom: 8, fontWeight: '700' },
  inputBox: {
    backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 16,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 16,
  },
  input: { paddingVertical: IS_SMALL ? 14 : 18, color: '#fff', fontSize: IS_SMALL ? 18 : 22, fontWeight: '600' },

  cityBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)', padding: 16, borderRadius: 16,
  },
  cityDot: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(251,191,36,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  cityName: { fontSize: IS_SMALL ? 17 : 19, fontWeight: '700', color: '#fff' },
  cityCoords: { fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 2 },

  ctaBtn: {
    borderRadius: 20, height: IS_SMALL ? 60 : 68, overflow: 'hidden', marginTop: 28,
    shadowColor: '#d97706', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 12,
  },
  ctaInner: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontWeight: '900', fontSize: IS_SMALL ? 17 : 20, letterSpacing: 1.5, textTransform: 'uppercase' },

  heroCard: { flexDirection: 'row', padding: IS_SMALL ? 22 : 28, alignItems: 'center' },
  heroLabel: { fontSize: 13, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 3, fontWeight: '700', marginBottom: 8 },
  heroValue: {
    fontSize: IS_SMALL ? 32 : 40, color: '#fff', fontWeight: '900',
    textShadowColor: 'rgba(251,191,36,0.35)', textShadowRadius: 20,
  },
  heroDetail: { fontSize: IS_SMALL ? 14 : 16, color: 'rgba(255,255,255,0.45)', marginTop: 8, fontWeight: '500' },
  heroSymbolBox: {
    width: IS_SMALL ? 64 : 76, height: IS_SMALL ? 64 : 76, borderRadius: 38,
    backgroundColor: 'rgba(251,191,36,0.06)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(251,191,36,0.25)',
  },
  heroSymbol: { fontSize: IS_SMALL ? 32 : 40, color: '#fbbf24' },

  tabBar: {
    flexDirection: 'row', marginBottom: 24,
    backgroundColor: 'rgba(0,0,0,0.45)', padding: 5, borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
  },
  tab: {
    flex: 1, paddingVertical: IS_SMALL ? 12 : 16, alignItems: 'center',
    borderRadius: 14, flexDirection: 'row', justifyContent: 'center', gap: 7,
  },
  tabActive: { backgroundColor: 'rgba(251,191,36,0.1)' },
  tabLabel: { color: 'rgba(255,255,255,0.3)', fontWeight: '600', fontSize: IS_SMALL ? 13 : 15 },
  tabLabelActive: { color: '#fbbf24', fontWeight: '700' },

  srChart: { marginBottom: 28, alignItems: 'center' },
  chartLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 14, width: '100%' },
  chartLabelLine: { flex: 1, height: 1, backgroundColor: 'rgba(251,191,36,0.12)' },
  chartTitle: {
    fontSize: IS_SMALL ? 12 : 14, fontWeight: '800', color: '#fbbf24',
    textAlign: 'center', letterSpacing: 3, textTransform: 'uppercase', opacity: 0.8,
  },
  legendBox: { marginTop: 16, paddingHorizontal: 4, alignItems: 'center' },
  legendTitle: { fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: '700', marginBottom: 8 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, fontWeight: '800' },
  legendName: { fontSize: 10, color: 'rgba(255,255,255,0.3)' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 10 },
  sectionTitle: { fontSize: IS_SMALL ? 18 : 22, fontWeight: '700', marginLeft: 12, letterSpacing: 0.3 },
  iconBox: { padding: 10, borderRadius: 14 },
  headerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginLeft: 16 },

  planetCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 18,
    padding: IS_SMALL ? 16 : 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  planetCircle: {
    width: IS_SMALL ? 48 : 56, height: IS_SMALL ? 48 : 56,
    borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 2,
  },
  planetCircleText: { fontSize: IS_SMALL ? 22 : 26, fontWeight: '700' },
  planetName: { fontSize: IS_SMALL ? 18 : 20, fontWeight: '700' },
  planetRashi: { fontSize: IS_SMALL ? 14 : 16, color: 'rgba(255,255,255,0.45)', marginTop: 3, fontWeight: '500' },
  degreePill: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  degreeText: {
    fontSize: IS_SMALL ? 14 : 16, color: 'rgba(255,255,255,0.55)', fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  tableHeader: {
    flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', marginTop: 8,
  },
  th: { color: 'rgba(255,255,255,0.3)', fontSize: IS_SMALL ? 12 : 14, fontWeight: '700', textTransform: 'uppercase' },
  tableRow: {
    flexDirection: 'row', paddingHorizontal: 20, paddingVertical: IS_SMALL ? 14 : 18,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)', alignItems: 'center',
  },
  tCell: { fontSize: IS_SMALL ? 14 : 17, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  tCellBold: { fontSize: IS_SMALL ? 14 : 17, color: '#fff', fontWeight: '700' },

  yogaCard: { padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  yogaName: { fontSize: IS_SMALL ? 17 : 20, color: '#34d399', fontWeight: '700', marginBottom: 6 },
  yogaDesc: { fontSize: IS_SMALL ? 15 : 17, color: 'rgba(255,255,255,0.6)', lineHeight: IS_SMALL ? 24 : 28 },

  rBlock: { padding: 22 },
  rText: { fontSize: IS_SMALL ? 16 : 18, color: 'rgba(255,255,255,0.7)', lineHeight: IS_SMALL ? 26 : 30 },

  traitGroup: { padding: 22, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  traitHead: { fontSize: IS_SMALL ? 14 : 16, color: '#fbbf24', fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },

  secretRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  secretLabel: { fontSize: IS_SMALL ? 15 : 17, color: 'rgba(255,255,255,0.7)', fontWeight: '700', marginBottom: 3 },
  secretHint: { fontSize: IS_SMALL ? 12 : 14, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' },
  secretValue: { fontSize: IS_SMALL ? 16 : 18, color: '#f472b6', fontWeight: '700', textAlign: 'right' },

  resetBtn: { marginTop: 32, alignItems: 'center' },
  resetInner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 16, paddingHorizontal: 28, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  resetText: { color: 'rgba(255,255,255,0.4)', fontWeight: '600', fontSize: IS_SMALL ? 15 : 17 },
  errorText: { color: '#ef4444', fontSize: IS_SMALL ? 16 : 18, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#1a1540', borderTopLeftRadius: 30, borderTopRightRadius: 30,
    padding: 24, height: '72%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.5, shadowRadius: 28, elevation: 24,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: IS_SMALL ? 24 : 28, fontWeight: '800', color: '#fff' },
  closeBtn: { padding: 4 },
  cityItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  cityIconBg: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(251,191,36,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  cityItemText: { fontSize: IS_SMALL ? 17 : 20, color: '#fff', fontWeight: '600' },
});
