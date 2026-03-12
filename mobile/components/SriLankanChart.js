import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';

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

// ============================================================
// Sri Lankan Traditional Rashi Kendara
//
// 3x3 grid with diagonal splits in corner cells.
// Uses HOUSE NUMBERS (bhava) in fixed grid positions:
//
//   +---------+---------+---------+
//   | 2  / 3  |    1    | 12 \ 11 |
//   +---------+---------+---------+
//   |    4    | CENTER  |   10    |
//   +---------+---------+---------+
//   | 5  \ 6  |    7    | 9  / 8  |
//   +---------+---------+---------+
//
// House 1 = Lagna rashi. Each house maps to a rashi:
//   rashiForHouse(N) = ((lagnaRashiId - 1 + (N - 1)) % 12) + 1
// ============================================================

export default function SriLankanChart({ rashiChart, lagnaRashiId, language, chartSize: customSize }) {
  const chartSize = customSize || Math.min(SCREEN_WIDTH - 40, 360);
  const cellW = chartSize / 3;
  const cellH = chartSize / 3;
  const borderColor = 'rgba(251,191,36,0.7)';
  const lineColor = 'rgba(251,191,36,0.5)';
  const isSmall = chartSize < 240;

  // Map house number to rashi ID based on Lagna
  const rashiForHouse = (houseNum) => ((lagnaRashiId - 1 + (houseNum - 1)) % 12) + 1;

  // Build rashi data from API response
  const rashiData = {};
  for (let i = 1; i <= 12; i++) {
    rashiData[i] = { planets: [], hasLagna: i === lagnaRashiId };
  }

  if (rashiChart && Array.isArray(rashiChart)) {
    rashiChart.forEach((entry) => {
      const rid = entry.rashiId;
      if (rid && rashiData[rid]) {
        if (entry.planets) {
          entry.planets.forEach(p => {
            const pName = typeof p === 'string' ? p : (p.name || '');
            if (pName === 'Lagna' || pName === 'Ascendant') {
              rashiData[rid].hasLagna = true;
            } else {
              rashiData[rid].planets.push(p);
            }
          });
        }
      }
    });
  }

  // Render planet list for a HOUSE (converts house → rashi internally)
  const renderPlanets = (houseNum, isCompact) => {
    const rid = rashiForHouse(houseNum);
    const data = rashiData[rid];
    if (!data) return null;
    const items = [];

    data.planets.forEach((p, idx) => {
      const pName = typeof p === 'string' ? p : (p.name || '');
      const info = PLANET_INFO[pName];
      const label = info ? (language === 'si' ? info.si : info.en) : pName.substring(0, 2);
      const deg = (!isSmall && p.degree != null) ? formatDegreeDot(p.degree) : '';
      items.push(
        <Text key={idx} style={[styles.planetLine, isSmall && styles.planetLineSmall, { color: info ? info.color : '#fff' }]} numberOfLines={1}>
          {label}{deg ? ('  ' + deg) : ''}
        </Text>
      );
    });

    if (items.length === 0) return null;
    return (
      <View style={styles.planetStack}>
        {items}
      </View>
    );
  };

  // House number label
  const houseNum = (num, pos) => (
    <Text style={[styles.rashiNumLabel, isSmall && styles.rashiNumLabelSmall, pos]}>{num}</Text>
  );

  // Top-Left corner: diagonal / from (0,cellH) to (cellW,0)
  // Upper-left triangle = House 2, Lower-right triangle = House 3
  const renderTopLeft = () => (
    <View style={[styles.cell, { width: cellW, height: cellH }]}>
      <Svg style={StyleSheet.absoluteFill} width={cellW} height={cellH}>
        <Line x1={0} y1={cellH} x2={cellW} y2={0} stroke={lineColor} strokeWidth={1} />
      </Svg>
      <View style={styles.triTopLeft}>
        {renderPlanets(2, true)}
      </View>
      <View style={styles.triBottomRight}>
        {renderPlanets(3, true)}
      </View>
      {houseNum(2, { top: 2, left: 3 })}
      {houseNum(3, { bottom: 2, right: 3 })}
    </View>
  );

  // Top-Right corner: diagonal \ from (0,0) to (cellW,cellH)
  // Upper-right triangle = House 12, Lower-left triangle = House 11
  const renderTopRight = () => (
    <View style={[styles.cell, { width: cellW, height: cellH }]}>
      <Svg style={StyleSheet.absoluteFill} width={cellW} height={cellH}>
        <Line x1={0} y1={0} x2={cellW} y2={cellH} stroke={lineColor} strokeWidth={1} />
      </Svg>
      <View style={styles.triTopRight}>
        {renderPlanets(12, true)}
      </View>
      <View style={styles.triBottomLeft}>
        {renderPlanets(11, true)}
      </View>
      {houseNum(12, { top: 2, right: 3 })}
      {houseNum(11, { bottom: 2, left: 3 })}
    </View>
  );

  // Bottom-Left corner: diagonal \ from (0,0) to (cellW,cellH)
  // Upper-right triangle = House 6, Lower-left triangle = House 5
  const renderBottomLeft = () => (
    <View style={[styles.cell, { width: cellW, height: cellH }]}>
      <Svg style={StyleSheet.absoluteFill} width={cellW} height={cellH}>
        <Line x1={0} y1={0} x2={cellW} y2={cellH} stroke={lineColor} strokeWidth={1} />
      </Svg>
      <View style={styles.triTopRight}>
        {renderPlanets(6, true)}
      </View>
      <View style={styles.triBottomLeft}>
        {renderPlanets(5, true)}
      </View>
      {houseNum(6, { top: 2, right: 3 })}
      {houseNum(5, { bottom: 2, left: 3 })}
    </View>
  );

  // Bottom-Right corner: diagonal / from (0,cellH) to (cellW,0)
  // Upper-left triangle = House 9, Lower-right triangle = House 8
  const renderBottomRight = () => (
    <View style={[styles.cell, { width: cellW, height: cellH }]}>
      <Svg style={StyleSheet.absoluteFill} width={cellW} height={cellH}>
        <Line x1={0} y1={cellH} x2={cellW} y2={0} stroke={lineColor} strokeWidth={1} />
      </Svg>
      <View style={styles.triTopLeft}>
        {renderPlanets(9, true)}
      </View>
      <View style={styles.triBottomRight}>
        {renderPlanets(8, true)}
      </View>
      {houseNum(9, { top: 2, left: 3 })}
      {houseNum(8, { bottom: 2, right: 3 })}
    </View>
  );

  // --- Edge cells (non-divided) ---
  const renderEdge = (houseNumVal) => {
    let numPos;
    if (houseNumVal === 1) numPos = { bottom: 2, left: cellW / 2 - 4 };
    else if (houseNumVal === 7) numPos = { top: 2, left: cellW / 2 - 4 };
    else if (houseNumVal === 4) numPos = { top: cellH / 2 - 6, right: 3 };
    else if (houseNumVal === 10) numPos = { top: cellH / 2 - 6, left: 3 };
    else numPos = { top: 3, right: 5 };
    return (
      <View style={[styles.cell, { width: cellW, height: cellH }]}>
        {houseNum(houseNumVal, numPos)}
        <View style={styles.edgeContent}>
          {renderPlanets(houseNumVal, false)}
        </View>
      </View>
    );
  };

  // --- Center ---
  const lagnaName = language === 'si'
    ? (RASHI_SI[lagnaRashiId] || '')
    : (RASHI_EN[lagnaRashiId] || '');

  return (
    <View style={[styles.chartBox, { width: chartSize, height: chartSize }]}>
      <Svg style={StyleSheet.absoluteFill} width={chartSize} height={chartSize}>
        <Rect x={1} y={1} width={chartSize - 2} height={chartSize - 2}
          stroke={borderColor} strokeWidth={2} fill="none" />
        <Line x1={cellW} y1={0} x2={cellW} y2={chartSize} stroke={borderColor} strokeWidth={1} />
        <Line x1={cellW * 2} y1={0} x2={cellW * 2} y2={chartSize} stroke={borderColor} strokeWidth={1} />
        <Line x1={0} y1={cellH} x2={chartSize} y2={cellH} stroke={borderColor} strokeWidth={1} />
        <Line x1={0} y1={cellH * 2} x2={chartSize} y2={cellH * 2} stroke={borderColor} strokeWidth={1} />
      </Svg>

      {/* Row 1: Houses 2/3 | 1 | 12/11 */}
      <View style={styles.row}>
        {renderTopLeft()}
        {renderEdge(1)}
        {renderTopRight()}
      </View>

      {/* Row 2: House 4 | Center | House 10 */}
      <View style={styles.row}>
        {renderEdge(4)}
        <View style={[styles.cell, styles.centerCell, { width: cellW, height: cellH }]}>
          <Text style={[styles.centerTitle, isSmall && { fontSize: 8 }]}>
            {language === 'si' ? '\u0DBB\u0DCF\u0DC1\u0DD2 \u0D9A\u0DDA\u0DB1\u0DCA\u0DAF\u0DCA\u200D\u0DBB\u0DBA' : 'Rashi Kendara'}
          </Text>
          <Text style={[styles.centerLagna, isSmall && { fontSize: 11 }]}>{lagnaName}</Text>
          <Text style={[styles.centerSub, isSmall && { fontSize: 7 }]}>
            {language === 'si' ? '\u0DBD\u0D9C\u0DCA\u0DB1\u0DBA' : 'Lagna'}
          </Text>
        </View>
        {renderEdge(10)}
      </View>

      {/* Row 3: Houses 5/6 | 7 | 9/8 */}
      <View style={styles.row}>
        {renderBottomLeft()}
        {renderEdge(7)}
        {renderBottomRight()}
      </View>
    </View>
  );
}

function formatDegree(deg) {
  if (deg == null || isNaN(deg)) return '';
  const d = Math.floor(deg);
  const m = Math.round((deg - d) * 60);
  return String(d).padStart(2, '0') + '\u00B0' + String(m).padStart(2, '0');
}

// Dot-style degree like the handwritten chart: 26·26
function formatDegreeDot(deg) {
  if (deg == null || isNaN(deg)) return '';
  const d = Math.floor(deg);
  const m = Math.round((deg - d) * 60);
  return String(d).padStart(2, '0') + '\u00B7' + String(m).padStart(2, '0');
}

const styles = StyleSheet.create({
  chartBox: {
    backgroundColor: 'rgba(10,3,25,0.95)',
    alignSelf: 'center',
    position: 'relative',
  },
  row: { flexDirection: 'row' },
  cell: {
    position: 'relative',
    overflow: 'hidden',
  },
  centerCell: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerTitle: {
    fontSize: 11,
    color: 'rgba(251,191,36,0.7)',
    fontWeight: '700',
    marginBottom: 2,
  },
  centerLagna: {
    fontSize: 16,
    color: '#fbbf24',
    fontWeight: 'bold',
  },
  centerSub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    marginTop: 2,
  },
  rashiNumLabel: {
    position: 'absolute',
    fontSize: 10,
    color: 'rgba(251,191,36,0.6)',
    fontWeight: '700',
    zIndex: 10,
  },
  rashiNumLabelSmall: {
    fontSize: 8,
  },
  planetLine: {
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 13,
    textAlign: 'left',
  },
  planetLineSmall: {
    fontSize: 7,
    lineHeight: 10,
  },
  planetStack: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 1,
  },
  edgeContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: 4,
  },
  triTopLeft: {
    position: 'absolute', top: 14, left: 4,
    width: '48%', height: '45%',
    justifyContent: 'flex-start', alignItems: 'flex-start',
  },
  triBottomRight: {
    position: 'absolute', bottom: 14, right: 4,
    width: '48%', height: '45%',
    justifyContent: 'flex-end', alignItems: 'flex-start',
  },
  triTopRight: {
    position: 'absolute', top: 14, right: 4,
    width: '48%', height: '45%',
    justifyContent: 'flex-start', alignItems: 'flex-end',
  },
  triBottomLeft: {
    position: 'absolute', bottom: 14, left: 4,
    width: '48%', height: '45%',
    justifyContent: 'flex-end', alignItems: 'flex-start',
  },
});
