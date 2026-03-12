import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Dimensions as ScreenDim } from 'react-native';

const { width: SCREEN_W } = ScreenDim.get('window');

// --- CONSTANTS ---

const RASHI_NAMES = [
  '', 'Mesha', 'Vrishabha', 'Mithuna', 'Kataka',
  'Simha', 'Kanya', 'Thula', 'Vrischika',
  'Dhanu', 'Makara', 'Kumbha', 'Meena'
];

const RASHI_SI = [
  '', 'මේෂ', 'වෘෂභ', 'මිථුන', 'කටක',
  'සිංහ', 'කන්‍යා', 'තුලා', 'වෘශ්චික',
  'ධනු', 'මකර', 'කුම්භ', 'මීන'
];

const PLANET_DISPLAY = {
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

const PLANET_SHORT = {
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

// --- HELPERS ---

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

// --- COMPONENTS ---

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

// --- EXPORTED CHART COMPONENT ---

export default function GenericChart({ houses, label, lagna, sizeW, hideLegend, language }) {
  var CHART_W = sizeW || (SCREEN_W - 44);
  var CELL = Math.floor(CHART_W / 3);
  var isCompact = CHART_W < 200;
  var gd = function(n) { return getHouseData(houses, n); };

  return (
    <View style={{ marginBottom: 20, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 14, width: '100%' }}>
        <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(251,191,36,0.12)' }} />
        <Text style={{
          fontSize: isCompact ? 10 : 14, letterSpacing: isCompact ? 1 : 3,
          fontWeight: '800', color: '#fbbf24', textAlign: 'center', textTransform: 'uppercase', opacity: 0.8,
        }}>{label || 'Rashi Chart'}</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(251,191,36,0.12)' }} />
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
        <View style={{ marginTop: 16, paddingHorizontal: 4, alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: '700', marginBottom: 8 }}>Legend:</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
            {['Surya','Chandra','Mangala','Budha','Guru','Shukra','Shani','Rahu','Ketu'].map(function(name) {
              var info = PLANET_DISPLAY[name];
              var shortLabel = language === 'si' ? PLANET_SHORT[name].si : PLANET_SHORT[name].en;
              return (
                <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: info.color }} />
                  <Text style={{ fontSize: 12, fontWeight: '800', color: info.color }}>{shortLabel}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}
