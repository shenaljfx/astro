var fs = require('fs');
var f = fs.readFileSync('mobile/app/(tabs)/porondam.js', 'utf8');

// ═══════════════════════════════════════════════════════════════════
// PREMIUM UI UPGRADE for Porondam Page
// - Better section dividers with subtle gradients
// - Premium Glass with accent borders
// - Refined factor bars with progress fills
// - Enhanced score gauge section with animated glow
// - Better typography and spacing
// - Luxurious card treatments
// ═══════════════════════════════════════════════════════════════════

// ─── 1. Upgrade FactorBar with animated progress bar fill ───
var oldFactorBar = 'function FactorBar({ f, index, language }) {\n' +
  '  var pct = f.maxScore > 0 ? f.score / f.maxScore : 0;\n' +
  '  var copy = getCompatibilityFactorCopy(f.name, language, f.score, f.maxScore);\n' +
  '  var tier = copy.tier;\n' +
  '  var iconName = tier === \'good\' ? \'checkmark-circle\' : tier === \'mixed\' ? \'alert-circle\' : \'close-circle\';\n' +
  '  var iconColor = tier === \'good\' ? \'#34D399\' : tier === \'mixed\' ? \'#FFB800\' : \'#F87171\';\n' +
  '  return (\n' +
  '    <Animated.View entering={FadeInUp.delay(100 * index).duration(500)} style={sty.factorItem}>\n' +
  '      <View style={sty.factorTop}>\n' +
  '        <View style={sty.factorNameRow}>\n' +
  '          <Ionicons name={iconName} size={20} color={iconColor} />\n' +
  '          <View style={{ marginLeft: 10, flex: 1 }}>\n' +
  '            <Text style={sty.factorName}>{copy.plainName}</Text>\n' +
  '            <Text style={sty.factorTech}>{copy.techName} \\u00B7 {f.score}/{f.maxScore}</Text>\n' +
  '          </View>\n' +
  '        </View>\n' +
  '      </View>\n' +
  '      {copy.insight ? <Text style={sty.factorInsight}>{copy.insight}</Text> : null}\n' +
  '    </Animated.View>\n' +
  '  );\n' +
  '}';

// Try with \r\n
var oldFactorBarCRLF = oldFactorBar.replace(/\n/g, '\r\n');
var fbIdx = f.indexOf(oldFactorBarCRLF);
if (fbIdx === -1) fbIdx = f.indexOf(oldFactorBar);

var newFactorBar = `function FactorBar({ f, index, language }) {
  var pct = f.maxScore > 0 ? f.score / f.maxScore : 0;
  var copy = getCompatibilityFactorCopy(f.name, language, f.score, f.maxScore);
  var tier = copy.tier;
  var iconName = tier === 'good' ? 'checkmark-circle' : tier === 'mixed' ? 'alert-circle' : 'close-circle';
  var iconColor = tier === 'good' ? '#34D399' : tier === 'mixed' ? '#FFB800' : '#F87171';
  var barColor = tier === 'good' ? ['#34D399', '#10B981'] : tier === 'mixed' ? ['#FFB800', '#F59E0B'] : ['#F87171', '#EF4444'];
  return (
    <Animated.View entering={FadeInUp.delay(80 * index).duration(500)} style={sty.factorItem}>
      <View style={sty.factorTop}>
        <View style={sty.factorNameRow}>
          <View style={[sty.factorIconWrap, { backgroundColor: iconColor + '18', borderColor: iconColor + '30' }]}>
            <Ionicons name={iconName} size={16} color={iconColor} />
          </View>
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={sty.factorName}>{copy.plainName}</Text>
            <Text style={sty.factorTech}>{copy.techName}</Text>
          </View>
          <View style={[sty.factorScorePill, { backgroundColor: iconColor + '12', borderColor: iconColor + '28' }]}>
            <Text style={[sty.factorScoreText, { color: iconColor }]}>{f.score}/{f.maxScore}</Text>
          </View>
        </View>
      </View>
      <View style={sty.barTrack}>
        <Animated.View entering={FadeIn.delay(200 + 80 * index).duration(800)} style={[sty.barFill, { width: (pct * 100) + '%' }]}>
          <LinearGradient colors={barColor} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
      </View>
      {copy.insight ? <Text style={sty.factorInsight}>{copy.insight}</Text> : null}
    </Animated.View>
  );
}`;

if (fbIdx !== -1) {
  var oldLen = f.indexOf(oldFactorBarCRLF) !== -1 ? oldFactorBarCRLF.length : oldFactorBar.length;
  f = f.substring(0, fbIdx) + newFactorBar + f.substring(fbIdx + oldLen);
  console.log('1. Upgraded FactorBar with progress bar + pill scores');
} else {
  console.log('WARNING: Could not find old FactorBar to replace');
}

// ─── 2. Upgrade the ScoreGauge Glass section ───
// Add a premium divider between ScoreGauge and factors
var factorsSectionMarker = '{data.factors && data.factors.length > 0 && (';
var fsIdx = f.indexOf(factorsSectionMarker);
if (fsIdx !== -1) {
  // Insert a decorative divider before factors
  var divider = `{/* Premium Section Divider */}
            <View style={sty.premiumDivider}>
              <View style={sty.dividerLine} />
              <View style={sty.dividerGem}><Ionicons name="diamond" size={10} color="rgba(255,184,0,0.5)" /></View>
              <View style={sty.dividerLine} />
            </View>

            `;
  f = f.substring(0, fsIdx) + divider + f.substring(fsIdx);
  console.log('2. Added premium divider before factors');
}

// ─── 3. Upgrade Strengths card title with gradient accent ───
var strengthsTitle = "language === 'si' ? '\\\\u0D94\\\\u0DB6\\\\u0D9C\\\\u0DDA \\\\u0DC1\\\\u0D9A\\\\u0DCA\\\\u0DAD\\\\u0DD2' : 'Your Strengths'";
// Actually let's just add a decorative line below the strengths card title  
var strengthsCardMarker = "function StrengthsCard({ data, language, bName, gName }) {";
var scIdx = f.indexOf(strengthsCardMarker);
// We'll enhance via styles instead

// ─── 4. Add premium section separator before Wedding Windows ───
var weddingMarker = "{/* Best Wedding Windows */}";
if (f.indexOf(weddingMarker) === -1) weddingMarker = "weddingWindows?.favorableWindows?.length > 0";
var wIdx = f.indexOf(weddingMarker);
if (wIdx !== -1) {
  var lineStart = f.lastIndexOf('\n', wIdx);
  var insertAt = lineStart + 1;
  var weddingDivider = '            <View style={sty.premiumDivider}>\n              <View style={sty.dividerLine} />\n              <View style={sty.dividerGem}><Ionicons name="diamond" size={10} color="rgba(255,184,0,0.5)" /></View>\n              <View style={sty.dividerLine} />\n            </View>\n\n';
  f = f.substring(0, insertAt) + weddingDivider + f.substring(insertAt);
  console.log('4. Added premium divider before wedding windows');
}

// ─── 5. Upgrade the Charts toggle to look more premium ───
var oldChartsToggle = "setChartsExpanded(!chartsExpanded); LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); }} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingVertical: 10 }}>";
var ctIdx = f.indexOf(oldChartsToggle);
if (ctIdx !== -1) {
  var newToggle = "setChartsExpanded(!chartsExpanded); LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); }} activeOpacity={0.7} style={sty.chartsToggle}>";
  f = f.replace(oldChartsToggle, newToggle);
  // Also replace the inner text/icon
  var oldToggleInner = "<Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700' }}><Ionicons name=\"grid\" size={14} color=\"rgba(255,255,255,0.4)\" />  {language === 'si' ? '\\u0DA2\\u0DCF\\u0DAD\\u0D9A \\u0DA0\\u0D9A\\u0DCA\\u200D\\u0DBB' : 'Birth Charts'}</Text>";
  var newToggleInner = "<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><View style={sty.chartsToggleIcon}><Ionicons name=\"grid\" size={13} color=\"#FF8C00\" /></View><Text style={sty.chartsToggleText}>{language === 'si' ? '\\u0DA2\\u0DCF\\u0DAD\\u0D9A \\u0DA0\\u0D9A\\u0DCA\\u200D\\u0DBB' : 'Birth Charts'}</Text></View>";
  f = f.replace(oldToggleInner, newToggleInner);
  console.log('5. Upgraded charts toggle to premium style');
} else {
  console.log('WARNING: Could not find charts toggle');
}

// ─── 6. Replace the RadarChart label that uses old .label ───
var oldRadarLabel = "return getCompatibilityFactorCopy(f.name, language).label;";
if (f.indexOf(oldRadarLabel) !== -1) {
  f = f.replace(oldRadarLabel, "return getCompatibilityFactorCopy(f.name, language, f.score, f.maxScore).plainName;");
  console.log('6. Fixed RadarChart labels to use plainName');
}

// ─── 7. Upgrade stylesheet with premium styles ───
var oldStyleEnd = '  reportText: { color: \'rgba(255,255,255,0.85)\', fontSize: 14, lineHeight: 24 },\n});';
var oldStyleEndCRLF = oldStyleEnd.replace(/\n/g, '\r\n');
var seIdx = f.indexOf(oldStyleEndCRLF);
if (seIdx === -1) seIdx = f.indexOf(oldStyleEnd);

var premiumStyles = `  reportText: { color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 24 },

  // ─── Premium UI Styles ───────────────────────────────────────────
  premiumDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, paddingHorizontal: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,184,0,0.12)' },
  dividerGem: { marginHorizontal: 12, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,184,0,0.06)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.15)', alignItems: 'center', justifyContent: 'center' },

  factorIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  factorScorePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  factorScoreText: { fontSize: 12, fontWeight: '900' },

  chartsToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, marginVertical: 8,
    borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.12)', backgroundColor: 'rgba(255,140,0,0.04)',
  },
  chartsToggleIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(255,140,0,0.10)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,140,0,0.18)' },
  chartsToggleText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700' },
});`;

if (seIdx !== -1) {
  var oldLen2 = f.indexOf(oldStyleEndCRLF) !== -1 ? oldStyleEndCRLF.length : oldStyleEnd.length;
  f = f.substring(0, seIdx) + premiumStyles + f.substring(seIdx + oldLen2);
  console.log('7. Added premium styles to stylesheet');
} else {
  console.log('WARNING: Could not find style end to add premium styles');
}

fs.writeFileSync('mobile/app/(tabs)/porondam.js', f);
console.log('\nDone! Premium UI upgrade applied.');
