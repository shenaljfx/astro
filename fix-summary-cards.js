var fs = require('fs');
var f = fs.readFileSync('mobile/app/(tabs)/porondam.js', 'utf8');

// ─── 1. Add StrengthsCard and ChallengesCard components before PersonCard ───
var personCardMarker = '// Person Input Card (with cosmic date/time pickers + CitySearchPicker)';
var pIdx = f.indexOf(personCardMarker);
if (pIdx === -1) { console.log('ERROR: Cannot find PersonCard marker'); process.exit(1); }

var newComponents = `// ======= STRENGTHS SUMMARY CARD =======
function StrengthsCard({ data, language, bName, gName }) {
  var strengths = [];
  // Collect good factors
  if (data.factors) {
    data.factors.forEach(function(fac) {
      var pct = fac.maxScore > 0 ? fac.score / fac.maxScore : 0;
      if (pct >= 0.75) {
        var copy = getCompatibilityFactorCopy(fac.name, language, fac.score, fac.maxScore);
        strengths.push({ icon: 'checkmark-circle', color: '#34D399', text: copy.plainName + ' \\u2014 ' + copy.insight });
      }
    });
  }
  // Yoga highlights
  var brideYogas = data.brideAdvanced?.tier1?.advancedYogas?.items || [];
  var groomYogas = data.groomAdvanced?.tier1?.advancedYogas?.items || [];
  var topYogas = brideYogas.concat(groomYogas).filter(function(y) { return y.strength === 'Very Strong' || y.strength === 'Strong'; }).slice(0, 3);
  topYogas.forEach(function(y) {
    var yCopy = getRelationshipStrengthCopy(y, language);
    strengths.push({ icon: 'flash', color: '#FFB800', text: yCopy.label });
  });
  // Good dasha harmony
  if (data.advancedPorondam?.advanced?.dashaCompatibility?.harmony === 'harmonious') {
    strengths.push({ icon: 'time', color: '#60a5fa', text: language === 'si' ? '\\u0DAF\\u0DD9\\u0DAF\\u0DD9\\u0DB1\\u0DCF\\u0D9C\\u0DDA\\u0DB8 \\u0DA2\\u0DD3\\u0DC0\\u0DD2\\u0DAD \\u0D85\\u0DAF\\u0DD2\\u0DBA\\u0DBB \\u0D9C\\u0DD0\\u0DBD\\u0DB4\\u0DDA' : 'Both in supportive life phases right now' });
  }
  // Strong navamsha
  if (data.advancedPorondam?.advanced?.navamshaCompatibility?.score >= 5) {
    strengths.push({ icon: 'heart', color: '#f9a8d4', text: language === 'si' ? '\\u0D9C\\u0DD0\\u0DB9\\u0DD4\\u0DBB\\u0DD4 \\u0DC3\\u0DB6\\u0DB3\\u0DAD\\u0DCF \\u0D9C\\u0DD0\\u0DBD\\u0DB4\\u0DD3\\u0DB8 \\u0DB4\\u0DCA\\u200D\\u0DBB\\u0DB6\\u0DBD' : 'Deep emotional bond is naturally strong' });
  }
  // Good magnetism
  if (data.magnetism && data.magnetism.score >= 7) {
    strengths.push({ icon: 'magnet', color: '#a78bfa', text: language === 'si' ? '\\u0D86\\u0D9A\\u0DBB\\u0DCA\\u0DC2\\u0DAB\\u0DBA \\u0DB4\\u0DCA\\u200D\\u0DBB\\u0DB6\\u0DBD' : 'Strong natural attraction between you' });
  }
  // Marriage planet strength
  if (data.advancedPorondam?.advanced?.marriagePlanetStrength?.score >= 3) {
    strengths.push({ icon: 'shield-checkmark', color: '#34d399', text: language === 'si' ? '\\u0DC3\\u0DB6\\u0DB3\\u0DAD\\u0DCF \\u0DC3\\u0DC4\\u0DCF\\u0DBA \\u0D9C\\u0DCA\\u200D\\u0DBB\\u0DC4 \\u0DB4\\u0DCA\\u200D\\u0DBB\\u0DB6\\u0DBD' : 'Planets strongly support this relationship' });
  }

  if (strengths.length === 0) return null;
  return (
    <Animated.View entering={FadeInUp.delay(850).duration(700)}>
      <Glass style={sty.section}>
        <View style={sty.secHeader}>
          <View>
            <Text style={sty.secTitle}><Ionicons name="sunny" size={16} color="#34D399" /> {language === 'si' ? '\\u0D94\\u0DB6\\u0D9C\\u0DDA \\u0DC1\\u0D9A\\u0DCA\\u0DAD\\u0DD2' : 'Your Strengths'}</Text>
            <Text style={sty.secSub}>{language === 'si' ? '\\u0DB8\\u0DDA \\u0DC3\\u0DB6\\u0DB3\\u0DAD\\u0DCF\\u0DC0\\u0DDA \\u0DC4\\u0DDC\\u0DB3\\u0DB8 \\u0D9A\\u0DDC\\u0DA7\\u0DC3\\u0DCA' : 'The best parts of your connection'}</Text>
          </View>
        </View>
        {strengths.slice(0, 6).map(function(s, i) {
          return (
            <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 12, paddingLeft: 4 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: s.color + '15', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={s.icon} size={14} color={s.color} />
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1, lineHeight: 20, alignSelf: 'center' }}>{s.text}</Text>
            </View>
          );
        })}
      </Glass>
    </Animated.View>
  );
}

// ======= CHALLENGES SUMMARY CARD =======
function ChallengesCard({ data, language, bName, gName }) {
  var challenges = [];
  // Collect poor factors
  if (data.factors) {
    data.factors.forEach(function(fac) {
      var pct = fac.maxScore > 0 ? fac.score / fac.maxScore : 0;
      if (pct < 0.25) {
        var copy = getCompatibilityFactorCopy(fac.name, language, fac.score, fac.maxScore);
        challenges.push({ icon: 'alert-circle', color: '#F87171', text: copy.plainName + ' \\u2014 ' + copy.insight });
      }
    });
  }
  // Doshas
  if (data.doshas && data.doshas.length > 0) {
    data.doshas.forEach(function(d) {
      var challengeCopy = getRelationshipChallengeCopy(d, language);
      challenges.push({ icon: 'warning', color: '#f59e0b', text: challengeCopy.label + (challengeCopy.desc ? ' \\u2014 ' + challengeCopy.desc : '') });
    });
  }
  // Mangala dosha (if severe/moderate)
  if (data.advancedPorondam?.advanced?.mangalaDosha?.severity === 'severe' || data.advancedPorondam?.advanced?.mangalaDosha?.severity === 'moderate') {
    var cancelled = data.advancedPorondam.advanced.mangalaDosha.bride?.cancelled && data.advancedPorondam.advanced.mangalaDosha.groom?.cancelled;
    if (!cancelled) {
      challenges.push({
        icon: 'flame',
        color: '#f87171',
        text: language === 'si' ? '\\u0D9C\\u0DD0\\u0DA7\\u0DD4\\u0DB8\\u0DCA \\u0DC3\\u0DD0\\u0DBD\\u0D9A\\u0DD2\\u0DBD\\u0DCA\\u0DBD \\u0D9A\\u0DBB\\u0DD4\\u0DAB\\u0DD4 \\u2014 \\u0D89\\u0DC0\\u0DC3\\u0DD3\\u0DB8 \\u0DC4\\u0DCF \\u0DC3\\u0DB1\\u0DCA\\u0DB1\\u0DD2\\u0DC0\\u0DDA\\u0DAF\\u0DB1\\u0DBA \\u0DC0\\u0DD0\\u0DAF\\u0D9C\\u0DAD\\u0DCA' : 'Conflict care point present \\u2014 patience and communication are essential',
      });
    }
  }
  // Conflicting dasha
  if (data.advancedPorondam?.advanced?.dashaCompatibility?.harmony === 'conflicting') {
    challenges.push({
      icon: 'time',
      color: '#f59e0b',
      text: language === 'si' ? '\\u0DA2\\u0DD3\\u0DC0\\u0DD2\\u0DAD \\u0D85\\u0DAF\\u0DD2\\u0DBA\\u0DBB \\u0DC0\\u0DD9\\u0DB1\\u0DC3\\u0DCA \\u2014 \\u0DAD\\u0DD0\\u0DB1\\u0DCA \\u0D9A\\u0DCF\\u0DBD\\u0DBA \\u0D9A\\u0DCA\\u200D\\u0DBB\\u0DB8\\u0DBA\\u0DD9\\u0DB1\\u0DCA \\u0DC3\\u0DD4\\u0D9C\\u0DB8 \\u0DC0\\u0DDA' : 'Different life phases right now \\u2014 timing will improve gradually',
    });
  }

  if (challenges.length === 0) return null;
  return (
    <Animated.View entering={FadeInUp.delay(900).duration(700)}>
      <Glass style={sty.section}>
        <View style={sty.secHeader}>
          <View>
            <Text style={sty.secTitle}><Ionicons name="eye" size={16} color="#f59e0b" /> {language === 'si' ? '\\u0DC3\\u0DD0\\u0DBD\\u0D9A\\u0DD2\\u0DBD\\u0DCA\\u0DBD \\u0DC0\\u0DD3\\u0DB8' : 'Watch Out For'}</Text>
            <Text style={sty.secSub}>{language === 'si' ? '\\u0DB8\\u0DDA\\u0DC0\\u0DCF\\u0DA7 \\u0DC3\\u0DD0\\u0DBD\\u0D9A\\u0DD2\\u0DBD\\u0DCA\\u0DBD \\u0DC0\\u0DD3\\u0DB8 \\u0DC4\\u0DDC\\u0DB3\\u0DBA\\u0DD2' : 'Areas that need a little more care'}</Text>
          </View>
        </View>
        {challenges.slice(0, 6).map(function(c, i) {
          return (
            <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 12, paddingLeft: 4 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.color + '15', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={c.icon} size={14} color={c.color} />
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1, lineHeight: 20, alignSelf: 'center' }}>{c.text}</Text>
            </View>
          );
        })}
      </Glass>
    </Animated.View>
  );
}

`;

f = f.substring(0, pIdx) + newComponents + f.substring(pIdx);
console.log('Step 1: Added StrengthsCard and ChallengesCard components');

// ─── 2. Insert cards after factors section in the render ───
// Find the closing of the factors section (after the FactorBar map)
var factorsEnd = '              </Animated.View>\r\n            )}\r\n\r\n            {data.doshas';
var fIdx = f.indexOf(factorsEnd);
if (fIdx === -1) {
  // Try without \r
  factorsEnd = '              </Animated.View>\n            )}\n\n            {data.doshas';
  fIdx = f.indexOf(factorsEnd);
}
if (fIdx === -1) { console.log('ERROR: Cannot find factors end insertion point'); process.exit(1); }

// Insert after the factors Animated.View closing and before doshas
var insertAfterFactors = factorsEnd.indexOf('{data.doshas');
var insertPoint = fIdx + insertAfterFactors;

var cardsJSX = `{/* Your Strengths */}
            <StrengthsCard data={data} language={language} bName={bName} gName={gName} />

            {/* Watch Out For */}
            <ChallengesCard data={data} language={language} bName={bName} gName={gName} />

            `;

f = f.substring(0, insertPoint) + cardsJSX + f.substring(insertPoint);
console.log('Step 2: Inserted cards into render');

// ─── 3. Remove the Porondam+ Combined Score section ───
var combinedStart = "            {/* \xC3\xA2\xE2\x80\x9A\xC2\xA2\xC3\xA2\xE2\x80\x9A\xC2\xA2\xC3\xA2\xE2\x80\x9A\xC2\xA2 PORONDAM+ COMBINED SCORE";
var combinedStartAlt = '{data.advancedPorondam?.combined && (';
var cIdx = f.indexOf(combinedStartAlt);
if (cIdx === -1) { console.log('WARNING: Combined score section not found, skipping removal'); }
else {
  // Find the matching closing
  var searchFrom = cIdx;
  // Find the Animated.View that contains it - go back to find the comment/Animated opening
  var lineStart = f.lastIndexOf('\n', cIdx) + 1;
  var before = f.substring(Math.max(0, cIdx - 200), cIdx);
  var animStart = before.lastIndexOf('<Animated.View');
  if (animStart === -1) animStart = before.lastIndexOf('{data.advancedPorondam');
  var realStart = cIdx - 200 + animStart;
  if (realStart < 0) realStart = cIdx;
  
  // Now find the closing </Animated.View> + closing )}
  // Count nested Animated.View tags
  var depth = 0;
  var pos = realStart;
  var combinedEnd = -1;
  while (pos < f.length) {
    if (f.substring(pos, pos + 15) === '<Animated.View') { depth++; pos += 15; }
    else if (f.substring(pos, pos + 16) === '</Animated.View>') {
      depth--;
      if (depth === 0) {
        // Find the )}\n after this
        var afterClose = f.indexOf('\n', pos + 16);
        var nextLine = f.indexOf('\n', afterClose + 1);
        combinedEnd = nextLine + 1;
        break;
      }
      pos += 16;
    }
    else { pos++; }
  }
  
  if (combinedEnd > realStart) {
    f = f.substring(0, realStart) + f.substring(combinedEnd);
    console.log('Step 3: Removed combined score section');
  } else {
    console.log('WARNING: Could not find end of combined score section');
  }
}

// ─── 4. Remove individual advanced sub-sections (dasha, navamsha, mangala, marriageStr) ───
// These are now represented in the summary cards
var sectionsToRemove = [
  'data.advancedPorondam?.advanced?.dashaCompatibility && data.advancedPorondam.advanced.dashaCompatibility.harmony',
  'data.advancedPorondam?.advanced?.navamshaCompatibility && (',
  'data.advancedPorondam?.advanced?.mangalaDosha && data.advancedPorondam.advanced.mangalaDosha.severity',
  'data.advancedPorondam?.advanced?.marriagePlanetStrength && (',
];

sectionsToRemove.forEach(function(marker) {
  var mIdx = f.indexOf(marker);
  if (mIdx === -1) { console.log('WARNING: Section not found: ' + marker.substring(0, 40)); return; }
  
  // Go back to find Animated.View start
  var before = f.substring(Math.max(0, mIdx - 300), mIdx);
  var animPos = before.lastIndexOf('<Animated.View');
  if (animPos === -1) { console.log('WARNING: No Animated.View before: ' + marker.substring(0, 40)); return; }
  var realStart = mIdx - 300 + animPos;
  if (mIdx - 300 < 0) realStart = before.lastIndexOf('<Animated.View');
  realStart = Math.max(0, mIdx - 300) + animPos;
  
  // Find matching close
  var depth = 0;
  var pos = realStart;
  var sectionEnd = -1;
  while (pos < f.length) {
    if (f.substring(pos, pos + 15) === '<Animated.View') { depth++; pos += 15; }
    else if (f.substring(pos, pos + 16) === '</Animated.View>') {
      depth--;
      if (depth === 0) {
        var afterClose = f.indexOf('\n', pos + 16);
        var nextLine = f.indexOf('\n', afterClose + 1);
        sectionEnd = nextLine + 1;
        break;
      }
      pos += 16;
    }
    else { pos++; }
  }
  
  if (sectionEnd > realStart) {
    f = f.substring(0, realStart) + f.substring(sectionEnd);
    console.log('  Removed section: ' + marker.substring(0, 50));
  }
});

// ─── 5. Also remove the Advanced Challenge Review and Yoga Comparison sections ───
// (their data feeds into summary cards too)
var advancedReviewMarker = '(data.brideAdvanced || data.groomAdvanced) && (';
var yogaMarker = '(data.brideAdvanced?.tier1?.advancedYogas?.items?.length > 0 || data.groomAdvanced?.tier1?.advancedYogas?.items?.length > 0) && (';
var jaiminiMarker = '(data.brideAdvanced?.tier1?.jaimini?.upapadaLagna || data.groomAdvanced?.tier1?.jaimini?.upapadaLagna) && (';

[advancedReviewMarker, yogaMarker, jaiminiMarker].forEach(function(marker) {
  var mIdx = f.indexOf(marker);
  if (mIdx === -1) { console.log('WARNING: Section not found: ' + marker.substring(0, 50)); return; }
  
  var before = f.substring(Math.max(0, mIdx - 300), mIdx);
  var animPos = before.lastIndexOf('<Animated.View');
  if (animPos === -1) { console.log('WARNING: No Animated.View before: ' + marker.substring(0, 50)); return; }
  var realStart = Math.max(0, mIdx - 300) + animPos;
  
  var depth = 0;
  var pos = realStart;
  var sectionEnd = -1;
  while (pos < f.length) {
    if (f.substring(pos, pos + 15) === '<Animated.View') { depth++; pos += 15; }
    else if (f.substring(pos, pos + 16) === '</Animated.View>') {
      depth--;
      if (depth === 0) {
        var afterClose = f.indexOf('\n', pos + 16);
        var nextLine = f.indexOf('\n', afterClose + 1);
        sectionEnd = nextLine + 1;
        break;
      }
      pos += 16;
    }
    else { pos++; }
  }
  
  if (sectionEnd > realStart) {
    f = f.substring(0, realStart) + f.substring(sectionEnd);
    console.log('  Removed section: ' + marker.substring(0, 50));
  }
});

fs.writeFileSync('mobile/app/(tabs)/porondam.js', f);
console.log('\nDone! Summary cards added, redundant sections removed.');
console.log('Total size:', f.length, 'chars');
