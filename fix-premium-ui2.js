var fs = require('fs');
var f = fs.readFileSync('mobile/app/(tabs)/porondam.js', 'utf8');

// ═══════════════════════════════════════════════════════════════════
// PREMIUM UI UPGRADE PASS 2
// - Better Strengths/Challenges list items (icon wrap + better spacing)
// - Refined action buttons (more premium feel)
// - Add barTrack subtle border
// - Increase factorItem spacing with subtle separator
// ═══════════════════════════════════════════════════════════════════

// ─── 1. Upgrade StrengthsCard list items ───
var oldStrengthItem = `            <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 12, paddingLeft: 4 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: s.color + '15', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={s.icon} size={14} color={s.color} />
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1, lineHeight: 20, alignSelf: 'center' }}>{s.text}</Text>
            </View>`;

var newStrengthItem = `            <View key={i} style={{ flexDirection: 'row', gap: 12, marginBottom: 14, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, backgroundColor: 'rgba(52,211,153,0.03)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.06)' }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: s.color + '12', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: s.color + '25' }}>
                <Ionicons name={s.icon} size={15} color={s.color} />
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, flex: 1, lineHeight: 20, alignSelf: 'center', fontWeight: '500' }}>{s.text}</Text>
            </View>`;

if (f.indexOf(oldStrengthItem) !== -1) {
  f = f.replace(oldStrengthItem, newStrengthItem);
  console.log('1. Upgraded StrengthsCard list items');
} else {
  // Try CRLF
  var oldCRLF = oldStrengthItem.replace(/\n/g, '\r\n');
  var newCRLF = newStrengthItem.replace(/\n/g, '\r\n');
  if (f.indexOf(oldCRLF) !== -1) {
    f = f.replace(oldCRLF, newCRLF);
    console.log('1. Upgraded StrengthsCard list items (CRLF)');
  } else {
    console.log('WARNING: Could not find StrengthsCard list item');
  }
}

// ─── 2. Upgrade ChallengesCard list items ───
var oldChallengeItem = `            <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 12, paddingLeft: 4 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.color + '15', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={c.icon} size={14} color={c.color} />
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1, lineHeight: 20, alignSelf: 'center' }}>{c.text}</Text>
            </View>`;

var newChallengeItem = `            <View key={i} style={{ flexDirection: 'row', gap: 12, marginBottom: 14, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, backgroundColor: 'rgba(248,113,113,0.02)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.06)' }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.color + '12', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.color + '25' }}>
                <Ionicons name={c.icon} size={15} color={c.color} />
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, flex: 1, lineHeight: 20, alignSelf: 'center', fontWeight: '500' }}>{c.text}</Text>
            </View>`;

if (f.indexOf(oldChallengeItem) !== -1) {
  f = f.replace(oldChallengeItem, newChallengeItem);
  console.log('2. Upgraded ChallengesCard list items');
} else {
  var oldCRLF2 = oldChallengeItem.replace(/\n/g, '\r\n');
  var newCRLF2 = newChallengeItem.replace(/\n/g, '\r\n');
  if (f.indexOf(oldCRLF2) !== -1) {
    f = f.replace(oldCRLF2, newCRLF2);
    console.log('2. Upgraded ChallengesCard list items (CRLF)');
  } else {
    console.log('WARNING: Could not find ChallengesCard list item');
  }
}

// ─── 3. Upgrade the action buttons row to be more premium ───
var oldActionRow = `              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                <TouchableOpacity
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,140,0,0.25)', backgroundColor: 'rgba(255,140,0,0.06)' }}`;

var newActionRow = `              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                <TouchableOpacity
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,140,0,0.20)', backgroundColor: 'rgba(255,140,0,0.05)' }}`;

if (f.indexOf(oldActionRow) !== -1) {
  f = f.replace(oldActionRow, newActionRow);
  console.log('3. Upgraded action buttons row');
} else {
  var oldAR_CRLF = oldActionRow.replace(/\n/g, '\r\n');
  var newAR_CRLF = newActionRow.replace(/\n/g, '\r\n');
  if (f.indexOf(oldAR_CRLF) !== -1) {
    f = f.replace(oldAR_CRLF, newAR_CRLF);
    console.log('3. Upgraded action buttons row (CRLF)');
  } else {
    console.log('WARNING: Could not find action buttons row');
  }
}

// ─── 4. Upgrade the factorItem style to have subtle bottom border ───
var oldFactorItemStyle = "factorItem: { marginBottom: 16 },";
var newFactorItemStyle = "factorItem: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },";
if (f.indexOf(oldFactorItemStyle) !== -1) {
  f = f.replace(oldFactorItemStyle, newFactorItemStyle);
  console.log('4. Added subtle separator to factor items');
}

// ─── 5. Enhance barTrack with subtle inner shadow via border ───
var oldBarTrack = "barTrack: { height: 7, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' },";
var newBarTrack = "barTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },";
if (f.indexOf(oldBarTrack) !== -1) {
  f = f.replace(oldBarTrack, newBarTrack);
  console.log('5. Enhanced barTrack styling');
}

// ─── 6. Enhance barFill to match track radius ───
var oldBarFill = "barFill: { height: 7, borderRadius: 4, overflow: 'hidden' },";
var newBarFill = "barFill: { height: '100%', borderRadius: 6, overflow: 'hidden' },";
if (f.indexOf(oldBarFill) !== -1) {
  f = f.replace(oldBarFill, newBarFill);
  console.log('6. Enhanced barFill styling');
}

// ─── 7. Make section style slightly more premium ───
var oldSection = "section: { marginBottom: 14 },";
var newSection = "section: { marginBottom: 16, borderColor: 'rgba(255,184,0,0.06)' },";
if (f.indexOf(oldSection) !== -1) {
  f = f.replace(oldSection, newSection);
  console.log('7. Enhanced section styling');
}

// ─── 8. Add slight padding to factorInsight ───
var oldInsight = "factorInsight: { color: 'rgba(255,232,176,0.85)', fontSize: 12, lineHeight: 18, marginTop: 8, paddingLeft: 30 },";
var newInsight = "factorInsight: { color: 'rgba(255,232,176,0.75)', fontSize: 12, lineHeight: 18, marginTop: 8, paddingLeft: 44, fontStyle: 'italic' },";
if (f.indexOf(oldInsight) !== -1) {
  f = f.replace(oldInsight, newInsight);
  console.log('8. Enhanced factorInsight styling');
}

fs.writeFileSync('mobile/app/(tabs)/porondam.js', f);
console.log('\nDone! Premium UI pass 2 applied.');
