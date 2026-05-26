// Add "Intimate Chemistry" card combining Yoni animals + Venus strength + passion spark
var fs = require('fs');
var f = fs.readFileSync('mobile/app/(tabs)/porondam.js', 'utf8');

// ─── INTIMATE CHEMISTRY CARD ───
var intimacyCard = `
// ======= INTIMATE CHEMISTRY CARD =======
function IntimateChemistryCard({ data, language, bName, gName }) {
  var T = language === 'si';
  
  // Get Yoni data from factors
  var yoniFactor = data.factors && data.factors.find(function(fac) { return fac.name === 'Yoni'; });
  var brideYoni = yoniFactor && yoniFactor.brideYoni;
  var groomYoni = yoniFactor && yoniFactor.groomYoni;
  var yoniScore = yoniFactor ? yoniFactor.score : 0;
  var yoniMax = yoniFactor ? yoniFactor.maxScore : 3;

  // Venus strength from marriage planet data
  var mp = data.advancedPorondam && data.advancedPorondam.advanced && data.advancedPorondam.advanced.marriagePlanetStrength;
  var brideVenus = mp && mp.bride ? mp.bride.venusStrength : null;
  var groomVenus = mp && mp.groom ? mp.groom.venusStrength : null;
  var brideVenusLabel = mp && mp.bride ? mp.bride.venusAssessment : null;
  var groomVenusLabel = mp && mp.groom ? mp.groom.venusAssessment : null;

  // Venus-Mars spark from magnetism factors
  var mag = data.magnetism;
  var sparkFactor = mag && mag.factors && mag.factors.find(function(fac) { return fac.nameEn === 'Venus-Mars Spark'; });
  var sparkScore = sparkFactor ? sparkFactor.score : 0;
  var sparkMax = sparkFactor ? sparkFactor.maxScore : 25;
  var sparkDetails = sparkFactor && sparkFactor.details ? sparkFactor.details : [];

  if (!brideYoni && !groomYoni && !sparkFactor) return null;

  // Animal icon mapping
  var YONI_META = {
    Horse: { icon: 'flash', color: '#F97316', trait: T ? '\\u0DC0\\u0DDA\\u0D9C\\u0DC0\\u0DAD\\u0DCA \\u0DC4\\u0DCF \\u0DC3\\u0DCA\\u0DC0\\u0DAD\\u0DB1\\u0DCA\\u0DAD\\u0DCA\\u0DBB' : 'Fast, free-spirited, adventurous' },
    Elephant: { icon: 'shield', color: '#A78BFA', trait: T ? '\\u0DB6\\u0DBD\\u0DC0\\u0DAD\\u0DCA \\u0DC4\\u0DCF \\u0DC3\\u0DCA\\u0DAD\\u0DD2\\u0DBB' : 'Powerful, loyal, protective' },
    Goat: { icon: 'leaf', color: '#34D399', trait: T ? '\\u0DB8\\u0DD8\\u0DAF\\u0DD4 \\u0DC4\\u0DCF \\u0DC3\\u0DD0\\u0DBD\\u0D9A\\u0DD2\\u0DBD\\u0DD2' : 'Gentle, tender, affectionate' },
    Serpent: { icon: 'eye', color: '#C084FC', trait: T ? '\\u0DAD\\u0DD3\\u0DC0\\u0DCA\\u200D\\u0DBB \\u0DC4\\u0DCF \\u0DBB\\u0DC4\\u0DC3\\u0DCA\\u0DB8\\u0DBA' : 'Intense, mysterious, magnetic' },
    Dog: { icon: 'heart', color: '#FB923C', trait: T ? '\\u0DB4\\u0DCF\\u0DBB\\u0DCA\\u0DC1\\u0DCA\\u0DC0\\u0DD2\\u0D9A \\u0DC4\\u0DCF \\u0DC0\\u0DD2\\u0DC1\\u0DCA\\u0DC0\\u0DCF\\u0DC3\\u0DBA' : 'Devoted, protective, faithful' },
    Cat: { icon: 'moon', color: '#F472B6', trait: T ? '\\u0DC3\\u0DD2\\u0DBD\\u0DD4\\u0DB8\\u0DD2\\u0DB1\\u0DD2 \\u0DC4\\u0DCF \\u0DC3\\u0DCA\\u0DC0\\u0DAD\\u0DB1\\u0DCA\\u0DAD\\u0DCA\\u0DBB' : 'Sensual, graceful, independent' },
    Rat: { icon: 'sparkles', color: '#FBBF24', trait: T ? '\\u0DA0\\u0DAD\\u0DD4\\u0DBB \\u0DC4\\u0DCF \\u0D85\\u0DB1\\u0DD4\\u0D9A\\u0DD6\\u0DBD' : 'Quick, clever, adaptable' },
    Cow: { icon: 'sunny', color: '#A3E635', trait: T ? '\\u0DC3\\u0DCF\\u0DB8\\u0DBA \\u0DC4\\u0DCF \\u0DB4\\u0DD2\\u0DBB\\u0DD2\\u0DB1\\u0DB8\\u0DCA' : 'Warm, nurturing, generous' },
    Buffalo: { icon: 'barbell', color: '#64748B', trait: T ? '\\u0DB6\\u0DBD\\u0DC0\\u0DAD\\u0DCA \\u0DC4\\u0DCF \\u0D89\\u0DC0\\u0DC3\\u0DD3\\u0DB8' : 'Strong, enduring, steady' },
    Tiger: { icon: 'flame', color: '#EF4444', trait: T ? '\\u0DAD\\u0DD3\\u0DC0\\u0DCA\\u200D\\u0DBB \\u0DC4\\u0DCF \\u0DB4\\u0DCA\\u200D\\u0DBB\\u0DB7\\u0DCF\\u0DC0\\u0DC1\\u0DCF\\u0DBD\\u0DD3' : 'Fierce, passionate, dominant' },
    Deer: { icon: 'flower', color: '#22D3EE', trait: T ? '\\u0DB8\\u0DD8\\u0DAF\\u0DD4 \\u0DC4\\u0DCF \\u0DBB\\u0DD4\\u0DC0\\u0D9A\\u0DCA' : 'Delicate, romantic, sensitive' },
    Monkey: { icon: 'happy', color: '#FB923C', trait: T ? '\\u0D9A\\u0DCA\\u200D\\u0DBB\\u0DD3\\u0DA9\\u0DCF\\u0DC1\\u0DD3\\u0DBD\\u0DD3 \\u0DC4\\u0DCF \\u0DC3\\u0DD0\\u0DBD\\u0D9A\\u0DD2' : 'Playful, experimental, fun' },
    Mongoose: { icon: 'rocket', color: '#F59E0B', trait: T ? '\\u0D89\\u0DC4\\u0DBD \\u0DC0\\u0DDA\\u0D9C\\u0DC0\\u0DAD\\u0DCA \\u0DC4\\u0DCF \\u0DB1\\u0DD2\\u0DBB\\u0DCA\\u0DB7\\u0DD3\\u0DAD' : 'Quick, bold, fearless' },
    Lion: { icon: 'star', color: '#F97316', trait: T ? '\\u0DB4\\u0DCA\\u200D\\u0DBB\\u0DB7\\u0DCF\\u0DC0\\u0DC1\\u0DCF\\u0DBD\\u0DD3 \\u0DC4\\u0DCF \\u0D86\\u0DAB\\u0DCA\\u0DA9\\u0DD4\\u0D9A\\u0DBB' : 'Commanding, proud, generous' },
  };

  var bm = YONI_META[brideYoni] || { icon: 'help-circle', color: '#FFB800', trait: '' };
  var gm = YONI_META[groomYoni] || { icon: 'help-circle', color: '#FFB800', trait: '' };

  // Yoni chemistry narrative
  var getYoniNarrative = function() {
    if (yoniScore >= 3) return T ? '\\u0D91\\u0D9A\\u0DB8 \\u0DBA\\u0DDD\\u0DB1\\u0DD2 \\u2014 \\u0DC3\\u0DCA\\u0DC0\\u0DCF\\u0DB7\\u0DCF\\u0DC0\\u0DD2\\u0D9A \\u0DC4\\u0DCF \\u0DAD\\u0DD3\\u0DC0\\u0DCA\\u200D\\u0DBB' : 'Same instincts \\u2014 effortlessly in sync physically';
    if (yoniScore >= 2) return T ? '\\u0D9C\\u0DD0\\u0DBD\\u0DB4\\u0DDA\\u0DB1 \\u0DBA\\u0DDD\\u0DB1\\u0DD2 \\u2014 \\u0DC3\\u0DCA\\u0DC0\\u0DCF\\u0DB7\\u0DCF\\u0DC0\\u0DD2\\u0D9A \\u0D86\\u0D9A\\u0DBB\\u0DCA\\u0DC2\\u0DAB\\u0DBA' : 'Compatible instincts \\u2014 natural physical attraction';
    return T ? '\\u0DC0\\u0DD9\\u0DB1\\u0DC3\\u0DCA \\u0DBA\\u0DDD\\u0DB1\\u0DD2 \\u2014 \\u0D86\\u0D9A\\u0DBB\\u0DCA\\u0DC2\\u0DAB\\u0DBA\\u0DA7 \\u0DB4\\u0DCA\\u200D\\u0DBB\\u0DBA\\u0DAD\\u0DCA\\u0DB1\\u0DBA \\u0D85\\u0DC0\\u0DC1\\u0DCA\\u200D\\u0DBA\\u0DBA\\u0DD2' : 'Opposing instincts \\u2014 tension that can become electric with effort';
  };

  // Venus strength tier
  var getVenusTier = function(score) {
    if (!score && score !== 0) return null;
    if (score >= 70) return { label: T ? '\\u0DB4\\u0DCA\\u200D\\u0DBB\\u0DB6\\u0DBD' : 'Radiant', color: '#34D399' };
    if (score >= 40) return { label: T ? '\\u0DB8\\u0DB0\\u0DCA\\u200D\\u0DBA\\u0DB8' : 'Warm', color: '#FFB800' };
    return { label: T ? '\\u0DC3\\u0DD4\\u0DBD\\u0DD4' : 'Reserved', color: '#F87171' };
  };

  var bvt = getVenusTier(brideVenus);
  var gvt = getVenusTier(groomVenus);

  // Spark intensity
  var sparkPct = sparkMax > 0 ? sparkScore / sparkMax : 0;
  var sparkColor = sparkPct >= 0.7 ? '#EF4444' : sparkPct >= 0.4 ? '#FB923C' : '#FFB800';
  var sparkLabel = sparkPct >= 0.7 ? (T ? '\\u0DAD\\u0DD3\\u0DC0\\u0DCA\\u200D\\u0DBB' : 'On Fire') : sparkPct >= 0.4 ? (T ? '\\u0D8B\\u0DC2\\u0DCA\\u0DAB' : 'Simmering') : (T ? '\\u0DB8\\u0DD8\\u0DAF\\u0DD4' : 'Slow Burn');

  return (
    <Animated.View entering={FadeInUp.delay(850).duration(700)}>
      <Glass style={sty.section}>
        <View style={sty.secHeader}>
          <View style={{ flex: 1 }}>
            <Text style={sty.secTitle}><Ionicons name="flame" size={15} color="#EF4444" /> {T ? '\\u0D86\\u0DAD\\u0DCA\\u0DB8\\u0DD3\\u0DBA \\u0DBB\\u0DC3\\u0DC0\\u0DD2\\u0DAF\\u0DCA\\u200D\\u0DBA\\u0DCF\\u0DC0' : 'Intimate Chemistry'}</Text>
            <Text style={sty.secSub}>{T ? '\\u0DC1\\u0DCF\\u0DBB\\u0DD3\\u0DBB\\u0DD2\\u0D9A \\u0DC4\\u0DCF \\u0DC4\\u0DD0\\u0D9F\\u0DD3\\u0DB8\\u0DCA \\u0D9C\\u0DD0\\u0DBD\\u0DB4\\u0DD3\\u0DB8' : 'Physical and emotional desire'}</Text>
          </View>
          <View style={[sty.factorScorePill, { backgroundColor: sparkColor + '14', borderColor: sparkColor + '30' }]}>
            <Ionicons name="flame" size={11} color={sparkColor} />
            <Text style={[sty.factorScoreText, { color: sparkColor, marginLeft: 3 }]}>{sparkLabel}</Text>
          </View>
        </View>

        {/* Animal Instincts / Yoni */}
        {brideYoni && groomYoni && (
          <View style={sty.intimYoniWrap}>
            <Text style={sty.intimSubhead}>{T ? '\\u0DC3\\u0DCA\\u0DC0\\u0DCF\\u0DB7\\u0DCF\\u0DC0\\u0DD2\\u0D9A \\u0DC3\\u0DCF\\u0DBB\\u0DBA' : 'Primal Instincts'}</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <View style={sty.intimAnimal}>
                <View style={[sty.intimAnimalIcon, { backgroundColor: bm.color + '14', borderColor: bm.color + '35' }]}>
                  <Ionicons name={bm.icon} size={18} color={bm.color} />
                </View>
                <Text style={[sty.intimAnimalName, { color: bm.color }]}>{T ? brideYoni : brideYoni}</Text>
                <Text style={sty.intimAnimalTrait} numberOfLines={2}>{bm.trait}</Text>
              </View>
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 4 }}>
                <View style={[sty.intimVs, { borderColor: yoniScore >= 2 ? '#34D399' + '40' : '#F87171' + '40' }]}>
                  <Text style={{ fontSize: 9, fontWeight: '900', color: yoniScore >= 2 ? '#34D399' : '#F87171' }}>{yoniScore}/{yoniMax}</Text>
                </View>
              </View>
              <View style={sty.intimAnimal}>
                <View style={[sty.intimAnimalIcon, { backgroundColor: gm.color + '14', borderColor: gm.color + '35' }]}>
                  <Ionicons name={gm.icon} size={18} color={gm.color} />
                </View>
                <Text style={[sty.intimAnimalName, { color: gm.color }]}>{T ? groomYoni : groomYoni}</Text>
                <Text style={sty.intimAnimalTrait} numberOfLines={2}>{gm.trait}</Text>
              </View>
            </View>
            <Text style={sty.intimNarrative}>{getYoniNarrative()}</Text>
          </View>
        )}

        {/* Venus Power - Desire Expression */}
        {(bvt || gvt) && (
          <View style={sty.intimVenusWrap}>
            <Text style={sty.intimSubhead}>{T ? '\\u0DC3\\u0DD2\\u0D9A\\u0DD4\\u0DBB\\u0DD4 \\u0DB6\\u0DBD\\u0DBA' : 'Desire Expression'}</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              {bvt && (
                <View style={sty.intimVenusBar}>
                  <Text style={sty.intimVenusWho}>{bName || (T ? '\\u0D94\\u0DB6' : 'Her')}</Text>
                  <View style={sty.intimVenusTrack}>
                    <View style={[sty.intimVenusFill, { width: (brideVenus || 0) + '%', backgroundColor: bvt.color }]} />
                  </View>
                  <Text style={[sty.intimVenusTier, { color: bvt.color }]}>{bvt.label}</Text>
                </View>
              )}
              {gvt && (
                <View style={sty.intimVenusBar}>
                  <Text style={sty.intimVenusWho}>{gName || (T ? '\\u0D94\\u0DC4\\u0DD4' : 'Him')}</Text>
                  <View style={sty.intimVenusTrack}>
                    <View style={[sty.intimVenusFill, { width: (groomVenus || 0) + '%', backgroundColor: gvt.color }]} />
                  </View>
                  <Text style={[sty.intimVenusTier, { color: gvt.color }]}>{gvt.label}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Spark Details */}
        {sparkDetails.length > 0 && (
          <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' }}>
            <Text style={sty.intimSubhead}>{T ? '\\u0D86\\u0DC0\\u0DDA\\u0D9C \\u0DC3\\u0D82\\u0D9A\\u0DDA\\u0DAD' : 'Spark Triggers'}</Text>
            {sparkDetails.slice(0, 3).map(function(d, i) {
              return (
                <View key={i} style={sty.intimSparkRow}>
                  <View style={sty.intimSparkDot} />
                  <Text style={sty.intimSparkText}>{T ? (d.si || d.en) : d.en}</Text>
                </View>
              );
            })}
          </View>
        )}
      </Glass>
    </Animated.View>
  );
}`;

// Insert before StrengthsCard
var insertPoint = 'function StrengthsCard(';
var idx = f.indexOf(insertPoint);
if (idx !== -1) {
  f = f.substring(0, idx) + intimacyCard + '\n\n' + f.substring(idx);
  console.log('OK: Inserted IntimateChemistryCard component');
} else {
  console.log('ERROR: Could not find insertion point');
  process.exit(1);
}

// ─── Wire it into the results section ───
// Insert after MagnetismCard
var magRender = '<MagnetismCard data={data} language={language} />';
var magIdx = f.indexOf(magRender);
if (magIdx !== -1) {
  var afterMag = magIdx + magRender.length;
  var intimRender = '\n\n            {/* Intimate Chemistry */}\n            <IntimateChemistryCard data={data} language={language} bName={bName} gName={gName} />';
  f = f.substring(0, afterMag) + intimRender + f.substring(afterMag);
  console.log('OK: Wired IntimateChemistryCard after Magnetism');
}

// ─── Add styles ───
var styleAnchor = '  timingAdvice: { fontSize: 12, color: \'rgba(255,255,255,0.5)\', textAlign: \'center\', marginTop: 12, fontStyle: \'italic\', lineHeight: 17 },';
var saIdx = f.indexOf(styleAnchor);
if (saIdx !== -1) {
  var afterAnchor = saIdx + styleAnchor.length;
  var newStyles = `

  // ─── Intimate Chemistry ───
  intimYoniWrap: { marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  intimSubhead: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1 },
  intimAnimal: { flex: 1, alignItems: 'center', gap: 4 },
  intimAnimalIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  intimAnimalName: { fontSize: 13, fontWeight: '900' },
  intimAnimalTrait: { fontSize: 9, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 13 },
  intimVs: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)' },
  intimNarrative: { fontSize: 11, color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginTop: 10, fontStyle: 'italic', lineHeight: 16 },
  intimVenusWrap: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  intimVenusBar: { flex: 1, gap: 4 },
  intimVenusWho: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '700' },
  intimVenusTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  intimVenusFill: { height: 6, borderRadius: 3 },
  intimVenusTier: { fontSize: 11, fontWeight: '800' },
  intimSparkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  intimSparkDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#EF4444', marginTop: 5, opacity: 0.7 },
  intimSparkText: { flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 16 },`;

  f = f.substring(0, afterAnchor) + newStyles + f.substring(afterAnchor);
  console.log('OK: Added intimate chemistry styles');
}

fs.writeFileSync('mobile/app/(tabs)/porondam.js', f);
console.log('\nDone! Intimate Chemistry card added.');
