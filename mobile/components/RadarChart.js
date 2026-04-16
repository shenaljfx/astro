/**
 * RadarChart — Animated SVG spider/radar chart for compatibility
 *
 * Props:
 *   factors   - array of { name, score, maxScore }
 *   size      - chart diameter (default 240)
 *   color1    - bride color (default '#A78BFA')
 *   color2    - groom/max reference color (default '#FFB800')
 *   labels    - optional array of label strings
 *   animated  - whether to animate in (default true)
 */
import React, { useEffect } from 'react';
import { View, Text, Platform } from 'react-native';
import Svg, { Polygon, Line, Circle, Text as SvgText, G, Defs,
  LinearGradient as SvgLinearGradient, Stop as SvgStop,
  RadialGradient as SvgRadialGradient } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedProps, withTiming, withDelay,
  useDerivedValue,
} from 'react-native-reanimated';

var AnimatedPolygon = Animated.createAnimatedComponent(Polygon);
var AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function RadarChart({ factors, size, color1, color2, labels, animated }) {
  if (!factors || factors.length < 3) return null;
  if (size === undefined) size = 240;
  if (color1 === undefined) color1 = '#A78BFA';
  if (color2 === undefined) color2 = '#FFB800';
  if (animated === undefined) animated = true;

  var n = factors.length;
  var PAD = 60;
  var vbW = size + PAD * 2;
  var vbH = size + PAD * 2;
  var cx = vbW / 2;
  var cy = vbH / 2;
  var R = size * 0.34;
  var angleStep = (2 * Math.PI) / n;
  var startAngle = -Math.PI / 2;

  function getPoint(idx, radius) {
    var angle = startAngle + idx * angleStep;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  }

  // Grid rings
  var rings = [0.25, 0.5, 0.75, 1.0];

  // Axis lines from center to each vertex
  var axes = [];
  for (var i = 0; i < n; i++) {
    var p = getPoint(i, R);
    axes.push({ x1: cx, y1: cy, x2: p.x, y2: p.y });
  }

  // Data points for the actual scores
  var dataPoints = factors.map(function (f, idx) {
    var pct = f.maxScore > 0 ? f.score / f.maxScore : 0;
    return getPoint(idx, R * Math.max(pct, 0.05));
  });
  var dataPath = dataPoints.map(function (p) { return p.x + ',' + p.y; }).join(' ');

  // Max reference (outer ring) points
  var maxPoints = factors.map(function (_, idx) { return getPoint(idx, R); });
  var maxPath = maxPoints.map(function (p) { return p.x + ',' + p.y; }).join(' ');

  // Animation
  var progress = useSharedValue(0);

  useEffect(function () {
    progress.value = 0;
    progress.value = withDelay(200, withTiming(1, { duration: 1200 }));
  }, []);

  // Animated data polygon - interpolate from center to actual position
  var animatedDataProps = useAnimatedProps(function () {
    var t = progress.value;
    var pts = [];
    for (var j = 0; j < n; j++) {
      var dx = dataPoints[j].x - cx;
      var dy = dataPoints[j].y - cy;
      pts.push((cx + dx * t) + ',' + (cy + dy * t));
    }
    return { points: pts.join(' ') };
  });

  // Label positions
  var labelR = R + 32;

  // Color for each score
  function scoreColor(f) {
    var pct = f.maxScore > 0 ? f.score / f.maxScore : 0;
    if (pct >= 0.75) return '#34D399';
    if (pct >= 0.5) return '#FFB800';
    if (pct >= 0.25) return '#F97316';
    return '#F87171';
  }

  return (
    <View style={{ width: size + 20, alignItems: 'center' }}>
      <Svg width={size + 20} height={size + 20} viewBox={'0 0 ' + vbW + ' ' + vbH}>
        <Defs>
          <SvgRadialGradient id="chartGlow" cx="50%" cy="50%" r="50%">
            <SvgStop offset="0%" stopColor={color1} stopOpacity={0.08} />
            <SvgStop offset="100%" stopColor={color1} stopOpacity={0} />
          </SvgRadialGradient>
          <SvgLinearGradient id="dataFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <SvgStop offset="0%" stopColor={color1} stopOpacity={0.25} />
            <SvgStop offset="100%" stopColor={color1} stopOpacity={0.08} />
          </SvgLinearGradient>
        </Defs>

        {/* Background glow */}
        <Circle cx={cx} cy={cy} r={R + 10} fill="url(#chartGlow)" />

        {/* Grid rings */}
        {rings.map(function (r, idx) {
          var pts = [];
          for (var j = 0; j < n; j++) {
            var p = getPoint(j, R * r);
            pts.push(p.x + ',' + p.y);
          }
          return (
            <Polygon key={'ring' + idx}
              points={pts.join(' ')}
              fill="none"
              stroke={idx === rings.length - 1 ? 'rgba(167,139,250,0.20)' : 'rgba(255,255,255,0.06)'}
              strokeWidth={idx === rings.length - 1 ? 1.2 : 0.5}
              strokeDasharray={idx < rings.length - 1 ? '2,4' : undefined}
            />
          );
        })}

        {/* Axis lines */}
        {axes.map(function (a, idx) {
          return (
            <Line key={'axis' + idx}
              x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
              stroke="rgba(167,139,250,0.10)" strokeWidth={0.7}
            />
          );
        })}

        {/* Max reference polygon (groom / full score outline) */}
        <Polygon
          points={maxPath}
          fill="none"
          stroke={color2}
          strokeWidth={1.2}
          strokeDasharray="4,4"
          opacity={0.35}
        />

        {/* Data polygon (animated) */}
        {Platform.OS === 'web' ? (
          <Polygon
            points={dataPath}
            fill="url(#dataFill)"
            stroke={color1}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        ) : (
          <AnimatedPolygon
            animatedProps={animatedDataProps}
            fill="url(#dataFill)"
            stroke={color1}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        )}

        {/* Data point dots */}
        {dataPoints.map(function (p, idx) {
          var sc = scoreColor(factors[idx]);
          return (
            <G key={'dp' + idx}>
              {/* Glow behind dot */}
              <Circle cx={p.x} cy={p.y} r={6} fill={sc} opacity={0.15} />
              {/* Dot */}
              <Circle cx={p.x} cy={p.y} r={3.5}
                fill={sc} stroke="rgba(0,0,0,0.4)" strokeWidth={0.8} />
            </G>
          );
        })}

        {/* Max reference dots */}
        {maxPoints.map(function (p, idx) {
          return (
            <Circle key={'mp' + idx} cx={p.x} cy={p.y} r={2}
              fill={color2} opacity={0.3} />
          );
        })}

        {/* Labels */}
        {factors.map(function (f, idx) {
          var lp = getPoint(idx, labelR);
          var pct = f.maxScore > 0 ? Math.round((f.score / f.maxScore) * 100) : 0;
          var sc = scoreColor(f);
          // Text anchor based on position
          var anchor = 'middle';
          if (lp.x < cx - 10) anchor = 'end';
          else if (lp.x > cx + 10) anchor = 'start';
          var labelName = (labels && labels[idx]) || f.name || '';
          if (labelName.length > 16) labelName = labelName.substring(0, 14) + '…';

          // Adjust Y for top/bottom labels
          var yOff = 0;
          if (lp.y < cy - R * 0.5) yOff = -4; // top labels: push up
          if (lp.y > cy + R * 0.5) yOff = 8;  // bottom labels: push down

          return (
            <G key={'lbl' + idx}>
              <SvgText
                x={lp.x} y={lp.y + yOff - 2}
                fill="rgba(255,255,255,0.6)"
                fontSize={11} fontWeight="700"
                textAnchor={anchor}
              >
                {labelName}
              </SvgText>
              <SvgText
                x={lp.x} y={lp.y + yOff + 12}
                fill={sc}
                fontSize={12} fontWeight="900"
                textAnchor={anchor}
              >
                {pct + '%'}
              </SvgText>
            </G>
          );
        })}

        {/* Center dot */}
        <Circle cx={cx} cy={cy} r={2.5} fill="rgba(167,139,250,0.3)" />
      </Svg>

      {/* Legend row below chart */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 12, height: 4, borderRadius: 2, backgroundColor: color1 }} />
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700' }}>Score</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 12, height: 4, borderRadius: 2, backgroundColor: color2, opacity: 0.5 }} />
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '700' }}>Max</Text>
        </View>
      </View>
    </View>
  );
}
