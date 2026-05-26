// ═══════════════════════════════════════════════════════════════════
// PORONDAM FULL FEATURE UPGRADE
// 1. Fix radar chart labels (short names)
// 2. Add StarProfiles card
// 3. Add AttractionCard
// 4. Add DeeperConnectionCard
// 5. Reorder sections + wire up
// 6. Add new styles
// ═══════════════════════════════════════════════════════════════════
var fs = require('fs');
var f = fs.readFileSync('mobile/app/(tabs)/porondam.js', 'utf8');
var lines = f.split(/\r?\n/);
var NL = f.indexOf('\r\n') !== -1 ? '\r\n' : '\n';

// ─── 1. Fix RadarChart labels — add shortName to getCompatibilityFactorCopy ───
// Find the return statement of getCompatibilityFactorCopy and add shortName
var returnLine = lines.findIndex(function(l) { return l.indexOf("plainName: fc.plainName[lang],") !== -1; });
if (returnLine !== -1) {
  // Check if shortName already exists
  if (f.indexOf('shortName:') === -1) {
    // Add shortName map before the return
    var shortNameMap = [
      "",
      "  // Short labels for radar chart",
      "  var shortNames = {",
      "    Dina: { en: 'Daily Life', si: '\\u0DAF\\u0DD2\\u0DB1\\u0DB4\\u0DAD\\u0DCF' },",
      "    Gana: { en: 'Conflict', si: '\\u0D9C\\u0DD0\\u0DA7\\u0DD4\\u0DB8\\u0DCA' },",
      "    Yoni: { en: 'Attraction', si: '\\u0D86\\u0D9A\\u0DBB\\u0DCA\\u0DC2\\u0DAB\\u0DBA' },",
      "    Rashi: { en: 'Emotions', si: '\\u0DC4\\u0DD0\\u0D9F\\u0DD3\\u0DB8\\u0DCA' },",
      "    Vasya: { en: 'Influence', si: '\\u0DC0\\u0DC1\\u0DCA\\u200D\\u0DBA' },",
      "    Nadi: { en: 'Family Health', si: '\\u0DB1\\u0DCF\\u0DA9\\u0DD2' },",
      "    Mahendra: { en: 'Prosperity', si: '\\u0DC3\\u0DB8\\u0DD8\\u0DAF\\u0DCA\\u0DB0\\u0DD2' },",
      "  };",
      "  var sn = shortNames[name];",
      "",
    ];
    // Insert before the line that has "var fc = factors[name];"
    var fcLine = lines.findIndex(function(l) { return l.indexOf("var fc = factors[name];") !== -1; });
    if (fcLine !== -1) {
      lines.splice(fcLine, 0, ...shortNameMap);
      console.log('1a. Added shortName map');
      // Re-find returnLine since we inserted lines
      returnLine = lines.findIndex(function(l) { return l.indexOf("plainName: fc.plainName[lang],") !== -1; });
    }
  }
  // Now add shortName to the return object
  if (returnLine !== -1 && lines[returnLine].indexOf('shortName') === -1) {
    // Add shortName field after plainName
    var indent = '    ';
    lines.splice(returnLine + 1, 0, indent + "shortName: sn ? sn[lang] : (fc ? fc.plainName[lang] : name),");
    console.log('1b. Added shortName to return object');
  }
}

// Now fix the RadarChart labels call to use shortName
f = lines.join(NL);
var oldRadarLabels = "labels={factors.map(function (f) {" + NL +
  "              return getCompatibilityFactorCopy(f.name, language, f.score, f.maxScore).plainName;" + NL +
  "            })}";
var newRadarLabels = "labels={factors.map(function (f) {" + NL +
  "              return getCompatibilityFactorCopy(f.name, language, f.score, f.maxScore).shortName;" + NL +
  "            })}";
if (f.indexOf(oldRadarLabels) !== -1) {
  f = f.replace(oldRadarLabels, newRadarLabels);
  console.log('1c. Fixed RadarChart to use shortName labels');
} else {
  // Try without the specific newline pattern
  f = f.replace(/return getCompatibilityFactorCopy\(f\.name, language, f\.score, f\.maxScore\)\.plainName;/, 
    'return getCompatibilityFactorCopy(f.name, language, f.score, f.maxScore).shortName;');
  console.log('1c. Fixed RadarChart labels (regex)');
}

// ─── 2. Add StarProfiles component function ───
var starProfilesComponent = `
// ======= STAR PROFILES CARD =======
function StarProfilesCard({ data, language, bName, gName }) {
  if (!data.bride || !data.groom) return null;
  var bride = data.bride;
  var groom = data.groom;
  var T = language === 'si';
  return (
    <Animated.View entering={FadeInUp.delay(300).duration(600)}>
      <Glass style={sty.section}>
        <View style={sty.secHeader}>
          <View>
            <Text style={sty.secTitle}><Ionicons name="star" size={15} color="#FFE8B0" /> {T ? '\\u0DB1\\u0DD0\\u0D9A\\u0DAD\\u0DCA \\u0DB4\\u0DBB\\u0DD2\\u0DA0\\u0DCA\\u0DA1\\u0DDA\\u0DAF' : 'Star Profiles'}</Text>
            <Text style={sty.secSub}>{T ? '\\u0D94\\u0DB6\\u0D9C\\u0DDA \\u0DA2\\u0DCA\\u200D\\u0DBA\\u0DDD\\u0DAD\\u0DD2\\u0DC2 \\u0DC4\\u0DD0\\u0DB3\\u0DD4\\u0DB1\\u0DD4\\u0DB8' : 'Your cosmic identity'}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={sty.profilePill}>
            <View style={[sty.profileDot, { backgroundColor: '#F9A8D4' }]} />
            <Text style={sty.profileName}>{bName || (T ? '\\u0DB8\\u0DB1\\u0DBD\\u0DD2' : 'Her')}</Text>
            <Text style={sty.profileSign}>{bride.rashi ? (T ? bride.rashi.sinhala : bride.rashi.name) : ''}</Text>
            <Text style={sty.profileStar}>{bride.nakshatra ? (T ? bride.nakshatra.sinhala : bride.nakshatra.name) : ''}{bride.nakshatra && bride.nakshatra.pada ? ' \\u00B7 Q' + bride.nakshatra.pada : ''}</Text>
            <Text style={sty.profileLord}>{T ? '\\u0D85\\u0DB0\\u0DD2\\u0DB4\\u0DAD\\u0DD2: ' : 'Ruled by: '}{bride.nakshatra ? bride.nakshatra.lord : ''}</Text>
          </View>
          <View style={sty.profilePill}>
            <View style={[sty.profileDot, { backgroundColor: '#93C5FD' }]} />
            <Text style={sty.profileName}>{gName || (T ? '\\u0DB8\\u0DD4\\u0DC4\\u0DD4\\u0DAB' : 'Him')}</Text>
            <Text style={sty.profileSign}>{groom.rashi ? (T ? groom.rashi.sinhala : groom.rashi.name) : ''}</Text>
            <Text style={sty.profileStar}>{groom.nakshatra ? (T ? groom.nakshatra.sinhala : groom.nakshatra.name) : ''}{groom.nakshatra && groom.nakshatra.pada ? ' \\u00B7 Q' + groom.nakshatra.pada : ''}</Text>
            <Text style={sty.profileLord}>{T ? '\\u0D85\\u0DB0\\u0DD2\\u0DB4\\u0DAD\\u0DD2: ' : 'Ruled by: '}{groom.nakshatra ? groom.nakshatra.lord : ''}</Text>
          </View>
        </View>
      </Glass>
    </Animated.View>
  );
}`;

// ─── 3. Add AttractionCard component function ───
var attractionComponent = `
// ======= ATTRACTION & CHEMISTRY CARD =======
function AttractionCard({ data, language }) {
  var mag = data.magnetism;
  if (!mag || !mag.totalScore) return null;
  var T = language === 'si';
  var score = mag.totalScore;
  var max = mag.maxScore || 10;
  var pct = max > 0 ? score / max : 0;

  var getTier = function(val) {
    if (!val) return { label: T ? '\\u0DB8\\u0DB0\\u0DCA\\u200D\\u0DBA\\u0DB8' : 'Moderate', color: '#FFB800' };
    var v = String(val).toLowerCase();
    if (v.indexOf('strong') !== -1 || v.indexOf('excellent') !== -1 || v.indexOf('high') !== -1) return { label: T ? '\\u0DB4\\u0DCA\\u200D\\u0DBB\\u0DB6\\u0DBD' : 'Strong', color: '#34D399' };
    if (v.indexOf('weak') !== -1 || v.indexOf('low') !== -1 || v.indexOf('none') !== -1) return { label: T ? '\\u0D85\\u0DA9\\u0DD4' : 'Mild', color: '#F87171' };
    return { label: T ? '\\u0DB8\\u0DB0\\u0DCA\\u200D\\u0DBA\\u0DB8' : 'Moderate', color: '#FFB800' };
  };

  var passion = getTier(mag.marsVenusConnection);
  var love = getTier(mag.venusVenusAspect);
  var emotional = getTier(mag.moonConnection);

  return (
    <Animated.View entering={FadeInUp.delay(1000).duration(700)}>
      <Glass style={sty.section}>
        <View style={sty.secHeader}>
          <View style={{ flex: 1 }}>
            <Text style={sty.secTitle}><Ionicons name="magnet" size={15} color="#F472B6" /> {T ? '\\u0D86\\u0D9A\\u0DBB\\u0DCA\\u0DC2\\u0DAB\\u0DBA \\u0DC4\\u0DCF \\u0DBB\\u0DC3\\u0DC0\\u0DD2\\u0DAF\\u0DCA\\u200D\\u0DBA\\u0DCF\\u0DC0' : 'Attraction & Chemistry'}</Text>
            <Text style={sty.secSub}>{T ? '\\u0D94\\u0DB6 \\u0DAF\\u0DD9\\u0DAF\\u0DD9\\u0DB1\\u0DCF \\u0D85\\u0DAD\\u0DBB \\u0D86\\u0D9A\\u0DBB\\u0DCA\\u0DC2\\u0DAB\\u0DBA' : 'How strongly you\\'re drawn together'}</Text>
          </View>
          <View style={[sty.factorScorePill, { backgroundColor: 'rgba(244,114,182,0.12)', borderColor: 'rgba(244,114,182,0.28)' }]}>
            <Text style={[sty.factorScoreText, { color: '#F472B6' }]}>{score}/{max}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
          <View style={sty.chemPill}>
            <View style={[sty.chemIcon, { backgroundColor: passion.color + '15', borderColor: passion.color + '30' }]}>
              <Ionicons name="flame" size={16} color={passion.color} />
            </View>
            <Text style={sty.chemLabel}>{T ? '\\u0D86\\u0DC0\\u0DDA\\u0D9C\\u0DBA' : 'Passion'}</Text>
            <Text style={[sty.chemTier, { color: passion.color }]}>{passion.label}</Text>
          </View>
          <View style={sty.chemPill}>
            <View style={[sty.chemIcon, { backgroundColor: love.color + '15', borderColor: love.color + '30' }]}>
              <Ionicons name="heart" size={16} color={love.color} />
            </View>
            <Text style={sty.chemLabel}>{T ? '\\u0D86\\u0DAF\\u0DBB\\u0DBA' : 'Love'}</Text>
            <Text style={[sty.chemTier, { color: love.color }]}>{love.label}</Text>
          </View>
          <View style={sty.chemPill}>
            <View style={[sty.chemIcon, { backgroundColor: emotional.color + '15', borderColor: emotional.color + '30' }]}>
              <Ionicons name="moon" size={16} color={emotional.color} />
            </View>
            <Text style={sty.chemLabel}>{T ? '\\u0DC4\\u0DD0\\u0D9F\\u0DD3\\u0DB8\\u0DCA' : 'Emotional'}</Text>
            <Text style={[sty.chemTier, { color: emotional.color }]}>{emotional.label}</Text>
          </View>
        </View>
        {mag.category && (
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 12, textAlign: 'center', fontStyle: 'italic' }}>
            {T ? mag.description || mag.category : mag.description || mag.category}
          </Text>
        )}
      </Glass>
    </Animated.View>
  );
}`;

// ─── 4. Add DeeperConnectionCard component function ───
var deeperComponent = `
// ======= DEEPER CONNECTION CARD =======
function DeeperConnectionCard({ data, language }) {
  var adv = data.advancedPorondam && data.advancedPorondam.advanced;
  if (!adv) return null;
  var T = language === 'si';

  var rows = [];

  // Life Phase Sync (Dasha)
  if (adv.dashaCompatibility) {
    var dc = adv.dashaCompatibility;
    var harmony = dc.harmony || 'mixed';
    var hColor = harmony === 'harmonious' ? '#34D399' : harmony === 'conflicting' ? '#F87171' : '#FFB800';
    var hLabel = harmony === 'harmonious' ? (T ? '\\u0D9C\\u0DD0\\u0DBD\\u0DB4\\u0DDA' : 'Aligned') : harmony === 'conflicting' ? (T ? '\\u0D9C\\u0DD0\\u0DA7\\u0DD4\\u0DB8\\u0DCA' : 'Conflicting') : (T ? '\\u0DB8\\u0DB0\\u0DCA\\u200D\\u0DBA\\u0DB8' : 'Mixed');
    var hDesc = dc.description || (harmony === 'harmonious' ? (T ? '\\u0DAF\\u0DD9\\u0DAF\\u0DD9\\u0DB1\\u0DCF\\u0DB8 \\u0DC3\\u0DC4\\u0DCF\\u0DBA\\u0D9A \\u0DA2\\u0DD3\\u0DC0\\u0DD2\\u0DAD \\u0D85\\u0DAF\\u0DD2\\u0DBA\\u0DBB\\u0DC0\\u0DBD' : 'Both in supportive life phases right now') : harmony === 'conflicting' ? (T ? '\\u0DC0\\u0DD9\\u0DB1\\u0DC3\\u0DCA \\u0DA2\\u0DD3\\u0DC0\\u0DD2\\u0DAD \\u0D85\\u0DAF\\u0DD2\\u0DBA\\u0DBB \\u2014 \\u0D9A\\u0DCF\\u0DBD\\u0DBA\\u0DB8 \\u0DC3\\u0DD4\\u0D9C\\u0DB8 \\u0DC0\\u0DDA' : 'Different life phases \u2014 timing will improve gradually') : (T ? '\\u0DC3\\u0DB8\\u0DC4\\u0DBB \\u0DC0\\u0DD9\\u0DB1\\u0DC3\\u0DCA \\u0DB1\\u0DB8\\u0DD4\\u0DAD\\u0DCA \\u0DC3\\u0DC4\\u0DCF\\u0DBA\\u0D9A' : 'Partly different but workable'));
    rows.push({ icon: 'time', title: T ? '\\u0DA2\\u0DD3\\u0DC0\\u0DD2\\u0DAD \\u0D85\\u0DAF\\u0DD2\\u0DBA\\u0DBB' : 'Life Phase Sync', badge: hLabel, badgeColor: hColor, desc: hDesc });
  }

  // Soul Bond (Navamsha)
  if (adv.navamshaCompatibility) {
    var nc = adv.navamshaCompatibility;
    var nScore = nc.score || 0;
    var nMax = nc.maxScore || 8;
    var nPct = nMax > 0 ? nScore / nMax : 0;
    var nColor = nPct >= 0.7 ? '#34D399' : nPct >= 0.4 ? '#FFB800' : '#F87171';
    var nDesc = nc.description || (nc.insights && nc.insights.length > 0 ? nc.insights[0] : (T ? '\\u0D9C\\u0DD0\\u0DB9\\u0DD4\\u0DBB\\u0DD4 \\u0DC4\\u0DD0\\u0D9F\\u0DD3\\u0DB8\\u0DCA \\u0DB6\\u0DB3\\u0DB1\\u0DBA' : 'Deep emotional bond level'));
    rows.push({ icon: 'heart-circle', title: T ? '\\u0D86\\u0DAD\\u0DCA\\u0DB8 \\u0DB6\\u0DB3\\u0DB1\\u0DBA' : 'Soul Bond', badge: nScore + '/' + nMax, badgeColor: nColor, desc: nDesc });
  }

  // Marriage Support (Marriage Planet Strength)
  if (adv.marriagePlanetStrength) {
    var mp = adv.marriagePlanetStrength;
    var mScore = mp.score || 0;
    var mMax = mp.maxScore || 5;
    var mPct = mMax > 0 ? mScore / mMax : 0;
    var mColor = mPct >= 0.7 ? '#34D399' : mPct >= 0.4 ? '#FFB800' : '#F87171';
    var mLabel = mPct >= 0.7 ? (T ? '\\u0DB4\\u0DCA\\u200D\\u0DBB\\u0DB6\\u0DBD' : 'Strong') : mPct >= 0.4 ? (T ? '\\u0DB8\\u0DB0\\u0DCA\\u200D\\u0DBA\\u0DB8' : 'Moderate') : (T ? '\\u0D85\\u0DA9\\u0DD4' : 'Weak');
    var mDesc = mp.assessment || (T ? '\\u0DC0\\u0DD2\\u0DC0\\u0DCF\\u0DC4\\u0DBA\\u0DA7 \\u0DC3\\u0DC4\\u0DCF\\u0DBA \\u0DC0\\u0DB1 \\u0D9C\\u0DCA\\u200D\\u0DBB\\u0DC4 \\u0DB6\\u0DBD\\u0DBA' : 'How strong love planets are for both');
    rows.push({ icon: 'shield-checkmark', title: T ? '\\u0DC0\\u0DD2\\u0DC0\\u0DCF\\u0DC4 \\u0DC3\\u0DC4\\u0DCF\\u0DBA' : 'Marriage Support', badge: mLabel, badgeColor: mColor, desc: mDesc });
  }

  if (rows.length === 0) return null;

  return (
    <Animated.View entering={FadeInUp.delay(1100).duration(700)}>
      <Glass style={sty.section}>
        <View style={sty.secHeader}>
          <View>
            <Text style={sty.secTitle}><Ionicons name="layers" size={15} color="#A78BFA" /> {T ? '\\u0D9C\\u0DD0\\u0DB9\\u0DD4\\u0DBB\\u0DD4 \\u0DC3\\u0DB6\\u0DB3\\u0DAD\\u0DCF\\u0DC0' : 'Deeper Connection'}</Text>
            <Text style={sty.secSub}>{T ? '\\u0DB4\\u0DD0\\u0DBD\\u0DB8\\u0DD4\\u0DB1\\u0DD2\\u0DA7\\u0DB8 \\u0DB4\\u0DD2\\u0DA7\\u0DD4\\u0DB4\\u0DC3\\u0DD9\\u0DB1\\u0DCA' : 'Beyond the surface match'}</Text>
          </View>
        </View>
        {rows.map(function(r, i) {
          return (
            <View key={i} style={sty.deepRow}>
              <View style={sty.deepLeft}>
                <View style={[sty.deepIcon, { backgroundColor: r.badgeColor + '12', borderColor: r.badgeColor + '25' }]}>
                  <Ionicons name={r.icon} size={16} color={r.badgeColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={sty.deepTitle}>{r.title}</Text>
                  <Text style={sty.deepDesc} numberOfLines={2}>{r.desc}</Text>
                </View>
              </View>
              <View style={[sty.deepBadge, { backgroundColor: r.badgeColor + '12', borderColor: r.badgeColor + '28' }]}>
                <Text style={[sty.deepBadgeText, { color: r.badgeColor }]}>{r.badge}</Text>
              </View>
            </View>
          );
        })}
      </Glass>
    </Animated.View>
  );
}`;

// Insert all 3 components before the StrengthsCard function
lines = f.split(NL);
var strengthsIdx = lines.findIndex(function(l) { return l.indexOf('function StrengthsCard(') !== -1; });
if (strengthsIdx !== -1) {
  var insertBlock = (starProfilesComponent + '\n' + attractionComponent + '\n' + deeperComponent).split('\n');
  lines.splice(strengthsIdx, 0, ...insertBlock);
  console.log('2-4. Added StarProfiles, Attraction, DeeperConnection components');
} else {
  console.log('WARNING: Could not find StrengthsCard location');
}

// ─── 5. Wire up new cards in the results section ───
f = lines.join(NL);

// Insert StarProfiles after the premium divider (before factors)
var factorsSection = '{data.factors && data.factors.length > 0 && (';
var fsIdx = f.indexOf(factorsSection);
if (fsIdx !== -1) {
  var starProfilesRender = `{/* Star Profiles */}
            <StarProfilesCard data={data} language={language} bName={bName} gName={gName} />

            `;
  f = f.substring(0, fsIdx) + starProfilesRender + f.substring(fsIdx);
  console.log('5a. Wired StarProfiles card');
}

// Insert AttractionCard + DeeperConnectionCard after ChallengesCard
var challengesEnd = '{/* Watch Out For */}' + NL + '            <ChallengesCard data={data} language={language} bName={bName} gName={gName} />';
var ceIdx = f.indexOf(challengesEnd);
if (ceIdx === -1) {
  // Try without the comment
  challengesEnd = '<ChallengesCard data={data} language={language} bName={bName} gName={gName} />';
  ceIdx = f.indexOf(challengesEnd);
}
if (ceIdx !== -1) {
  var afterChallenges = ceIdx + challengesEnd.length;
  var newCards = NL + NL + '            {/* Attraction & Chemistry */}' + NL + '            <AttractionCard data={data} language={language} />' + NL + NL + '            {/* Deeper Connection */}' + NL + '            <DeeperConnectionCard data={data} language={language} />';
  f = f.substring(0, afterChallenges) + newCards + f.substring(afterChallenges);
  console.log('5b. Wired Attraction + DeeperConnection cards');
}

// ─── 6. Add new styles ───
var styleEnd = '  chartsToggleText: { color: \'rgba(255,255,255,0.7)\', fontSize: 13, fontWeight: \'700\' },' + NL + '});';
var seIdx = f.indexOf(styleEnd);
if (seIdx !== -1) {
  var newStyles = `  chartsToggleText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700' },

  // ─── Star Profiles ───
  profilePill: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 14, alignItems: 'center', gap: 4 },
  profileDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  profileName: { fontSize: 12, fontWeight: '800', color: '#FFE8B0', marginBottom: 2 },
  profileSign: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  profileStar: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  profileLord: { fontSize: 10, color: 'rgba(255,140,0,0.6)', marginTop: 4 },

  // ─── Attraction Chemistry pills ───
  chemPill: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 12, alignItems: 'center', gap: 6 },
  chemIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  chemLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  chemTier: { fontSize: 13, fontWeight: '900' },

  // ─── Deeper Connection rows ───
  deepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  deepLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  deepIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  deepTitle: { fontSize: 13, fontWeight: '700', color: '#FFE8B0' },
  deepDesc: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2, lineHeight: 15 },
  deepBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, marginLeft: 8 },
  deepBadgeText: { fontSize: 11, fontWeight: '900' },
});`;
  f = f.substring(0, seIdx) + newStyles + f.substring(seIdx + styleEnd.length);
  console.log('6. Added new styles');
}

// Also hide technical names in English for factor bars
// In FactorBar, show techName only in Sinhala
var oldTechLine = "            <Text style={sty.factorTech}>{copy.techName}</Text>";
var newTechLine = "            {language === 'si' && <Text style={sty.factorTech}>{copy.techName}</Text>}";
if (f.indexOf(oldTechLine) !== -1) {
  f = f.replace(oldTechLine, newTechLine);
  console.log('7. Tech names now only show in Sinhala');
}

fs.writeFileSync('mobile/app/(tabs)/porondam.js', f);
console.log('\nDone! All features implemented.');
