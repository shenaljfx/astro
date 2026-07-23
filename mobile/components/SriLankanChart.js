import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import Svg, { Line, Rect, Path, Defs, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { ZODIAC_IMAGES } from './ZodiacIcons';
import { ZODIAC_ORDERED } from '../assets/onboarding';

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

function SriLankanChart({ rashiChart, lagnaRashiId, language, chartSize: customSize }) {
  const chartSize = customSize || Math.min(SCREEN_WIDTH - 40, 360);
  // The frame lives in a padding ring OUTSIDE the grid, so ornament never
  // covers a house number or a planet. The grid keeps the full inner square.
  const pad = Math.round(chartSize * 0.055);
  const gridSize = chartSize - pad * 2;
  const cellW = gridSize / 3;
  const cellH = gridSize / 3;
  const borderColor = 'rgba(246,213,132,0.85)';
  const lineColor = 'rgba(232,181,77,0.42)';
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

  // corner bracket, drawn in the frame ring (never over the grid)
  const bracket = (x, y, sx, sy) => {
    const L = pad * 1.15, o = pad * 0.42;
    return 'M' + (x + sx * (o + L)) + ',' + (y + sy * o) +
      ' L' + (x + sx * o) + ',' + (y + sy * o) +
      ' L' + (x + sx * o) + ',' + (y + sy * (o + L));
  };

  return (
    <View style={[styles.chartBox, { width: chartSize, height: chartSize }]}>
      {/* a calm indigo ground with a soft centre lift — nothing that competes
          with the data sitting on top of it */}
      <LinearGradient
        pointerEvents="none"
        colors={['#1A1140', '#120B30', '#0C0722']}
        locations={[0, 0.5, 1]}
        style={[StyleSheet.absoluteFill, { borderRadius: 6 }]}
        start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }}
      />
      <Svg style={StyleSheet.absoluteFill} width={chartSize} height={chartSize}>
        <Defs>
          <SvgLinearGradient id="chartRule" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#F6D584" stopOpacity="0.95" />
            <Stop offset="0.5" stopColor="#E8B54D" stopOpacity="0.6" />
            <Stop offset="1" stopColor="#F6D584" stopOpacity="0.95" />
          </SvgLinearGradient>
        </Defs>

        {/* outer engraved rule + the grid's own border, with the ring between */}
        <Rect x={1.5} y={1.5} width={chartSize - 3} height={chartSize - 3}
          stroke="url(#chartRule)" strokeWidth={1.5} fill="none" rx={6} />
        <Rect x={pad} y={pad} width={gridSize} height={gridSize}
          stroke="url(#chartRule)" strokeWidth={1.3} fill="none" />

        {/* gold brackets tucked into the ring corners */}
        {[[0, 0, 1, 1], [chartSize, 0, -1, 1], [chartSize, chartSize, -1, -1], [0, chartSize, 1, -1]].map((c, i) => (
          <Path key={'br' + i} d={bracket(c[0], c[1], c[2], c[3])}
            stroke="rgba(246,213,132,0.75)" strokeWidth={1.4} fill="none" strokeLinecap="round" />
        ))}

        {/* the twelve-house grid */}
        <Line x1={pad + cellW} y1={pad} x2={pad + cellW} y2={pad + gridSize} stroke={lineColor} strokeWidth={1} />
        <Line x1={pad + cellW * 2} y1={pad} x2={pad + cellW * 2} y2={pad + gridSize} stroke={lineColor} strokeWidth={1} />
        <Line x1={pad} y1={pad + cellH} x2={pad + gridSize} y2={pad + cellH} stroke={lineColor} strokeWidth={1} />
        <Line x1={pad} y1={pad + cellH * 2} x2={pad + gridSize} y2={pad + cellH * 2} stroke={lineColor} strokeWidth={1} />
      </Svg>

      <View style={{ position: 'absolute', left: pad, top: pad, width: gridSize, height: gridSize }}>
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
            {language === 'si' ? '\u0DBB\u0DCF\u0DC1\u0DD2 \u0D9A\u0DDA\u0DB1\u0DCA\u0DAF\u0DCA\u200D\u0DBB\u0DBA' : 'Birth Chart'}
          </Text>
          {(ZODIAC_ORDERED[lagnaRashiId - 1] || ZODIAC_IMAGES[lagnaRashiId - 1]) && (
            <Image
              source={ZODIAC_ORDERED[lagnaRashiId - 1] || ZODIAC_IMAGES[lagnaRashiId - 1]}
              style={{
                width: isSmall ? 40 : 56,
                height: isSmall ? 40 : 56,
                marginVertical: 3,
              }}
              resizeMode="contain"
            />
          )}
          <Text style={[styles.centerLagna, isSmall && { fontSize: 11 }]}>{lagnaName}</Text>
          <Text style={[styles.centerSub, isSmall && { fontSize: 7 }]}>
            {language === 'si' ? '\u0DBD\u0D9C\u0DCA\u0DB1\u0DBA' : 'Rising Sign'}
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
    backgroundColor: 'rgba(14,8,32,0.96)',
    alignSelf: 'center',
    position: 'relative',
    borderRadius: 4,
    shadowColor: 'rgba(232,181,77,0.45)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 26,
    elevation: 12,
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
    fontSize: 9.5,
    color: 'rgba(240,214,150,0.7)',
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  centerLagna: {
    fontSize: 17,
    color: '#F6D584',
    fontWeight: '900',
    letterSpacing: 0.4,
    textShadowColor: 'rgba(232,181,77,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
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
    color: 'rgba(246,213,132,0.72)',
    fontWeight: '800',
    zIndex: 10,
  },
  rashiNumLabelSmall: {
    fontSize: 8,
  },
  planetLine: {
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 14,
    textAlign: 'left',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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

// Memoized to prevent re-renders when props are stable.
export default React.memo(SriLankanChart);