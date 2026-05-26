// ═══════════════════════════════════════════════════════════════════
// PORONDAM SPICY CARDS UPGRADE
// 1. Add ElementsCard (Fire/Water/Earth/Air)
// 2. Replace AttractionCard → MagnetismCard (5 factors)
// 3. Add SoulBlueprintCard (Jaimini atmakaraka)
// 4. Add PastLivesCard (Ketu themes + narrative)
// 5. Add RedFlagCard (Mangal Dosha)
// 6. Add TimingCard (Sade Sati)
// 7. Reorder all sections
// 8. Add styles
// ═══════════════════════════════════════════════════════════════════
var fs = require('fs');
var f = fs.readFileSync('mobile/app/(tabs)/porondam.js', 'utf8');

// ─── 1. ELEMENTS CARD ───
var elementsCard = `
// ======= YOUR ELEMENTS CARD =======
function ElementsCard({ data, language }) {
  var be = data.brideEnhanced && data.brideEnhanced.tattvaBalance;
  var ge = data.groomEnhanced && data.groomEnhanced.tattvaBalance;
  if (!be || !ge) return null;
  var T = language === 'si';

  var ELEM = {
    Fire: { icon: 'flame', color: '#F97316', si: '\\u0D85\\u0D9C\\u0DCA\\u0DB1\\u0DD2' },
    Earth: { icon: 'globe', color: '#A3E635', si: '\\u0DB4\\u0DD8\\u0DAD\\u0DD2\\u0DC0\\u0DD2' },
    Air: { icon: 'cloudy', color: '#60A5FA', si: '\\u0DC0\\u0DCF\\u0DBA\\u0DD4' },
    Water: { icon: 'water', color: '#22D3EE', si: '\\u0DA2\\u0DBD' },
    Ether: { icon: 'sparkles', color: '#C084FC', si: '\\u0D86\\u0D9A\\u0DCF\\u0DC1' },
  };

  var brideEl = ELEM[be.dominant] || ELEM.Fire;
  var groomEl = ELEM[ge.dominant] || ELEM.Fire;

  // Generate interaction metaphor
  var getMetaphor = function(b, g) {
    var pair = b + '+' + g;
    var metaphors = {
      'Fire+Water': T ? '\\u0DC4\\u0DB8\\u0DD4\\u0DC0\\u0DB1 \\u0DC0\\u0DD2\\u0DA7 \\u0DB4\\u0DCA\\u200D\\u0DBB\\u0DB6\\u0DBD' : 'Steam when you meet \\u2014 intense and transformative',
      'Fire+Fire': T ? '\\u0DAF\\u0DD9\\u0DAF\\u0DD9\\u0DB1\\u0DCF\\u0DB8 \\u0D85\\u0D9C\\u0DCA\\u0DB1\\u0DD2' : 'Double fire \\u2014 passionate but watch for burnout',
      'Fire+Earth': T ? '\\u0DB4\\u0DD8\\u0DAD\\u0DD2\\u0DC0\\u0DD2\\u0DBA \\u0D8B\\u0DC2\\u0DCA\\u0DAB \\u0D9A\\u0DBB\\u0DBA\\u0DD2' : 'Fire warms earth \\u2014 you bring each other to life',
      'Fire+Air': T ? '\\u0DC0\\u0DCF\\u0DBA\\u0DD4\\u0DC0 \\u0D85\\u0D9C\\u0DCA\\u0DB1\\u0DD2\\u0DBA \\u0DAF\\u0DD2\\u0DBB\\u0DD2 \\u0D9A\\u0DBB\\u0DBA\\u0DD2' : 'Air fans the flames \\u2014 exciting and ever-growing',
      'Water+Water': T ? '\\u0D9C\\u0DD0\\u0DB9\\u0DD4\\u0DBB\\u0DD4 \\u0DC4\\u0DD0\\u0D9F\\u0DD3\\u0DB8\\u0DCA' : 'Deep ocean together \\u2014 emotionally boundless',
      'Water+Earth': T ? '\\u0DB4\\u0DD8\\u0DAD\\u0DD2\\u0DC0\\u0DD2\\u0DBA \\u0DC3\\u0DB8\\u0DD8\\u0DAF\\u0DCA\\u0DB0' : 'Water nourishes earth \\u2014 naturally fertile bond',
      'Water+Air': T ? '\\u0DC0\\u0DD0\\u0DC3\\u0DCA\\u0DC3 \\u0DC4\\u0DCF \\u0DC0\\u0DCF\\u0DBA\\u0DD4' : 'Mist and breeze \\u2014 dreamy but needs grounding',
      'Earth+Earth': T ? '\\u0DC3\\u0DCA\\u0DAD\\u0DD2\\u0DBB \\u0DB6\\u0DD2\\u0DB8' : 'Solid bedrock \\u2014 stable and unshakeable',
      'Earth+Air': T ? '\\u0DB4\\u0DD8\\u0DAD\\u0DD2\\u0DC0\\u0DD2 \\u0DC4\\u0DCF \\u0DC0\\u0DCF\\u0DBA\\u0DD4' : 'Mountains meet wind \\u2014 steady yet free',
      'Air+Air': T ? '\\u0DC0\\u0DCF\\u0DBA\\u0DD4 \\u0DAF\\u0DD9\\u0D9A\\u0D9A\\u0DCA' : 'Two winds \\u2014 intellectual spark, needs anchoring',
    };
    return metaphors[pair] || metaphors[g + '+' + b] || (T ? '\\u0DC0\\u0DD2\\u0DC1\\u0DD2\\u0DC2\\u0DCA\\u0DA7 \\u0DB8\\u0DD2\\u0DC1\\u0DCA\\u200D\\u0DBB\\u0DAB\\u0DBA\\u0D9A\\u0DCA' : 'A unique elemental mix \\u2014 intriguing chemistry');
  };

  var metaphor = getMetaphor(be.dominant, ge.dominant);

  return (
    <Animated.View entering={FadeInUp.delay(350).duration(600)}>
      <Glass style={sty.section}>
        <View style={sty.secHeader}>
          <View>
            <Text style={sty.secTitle}><Ionicons name="prism" size={15} color="#A3E635" /> {T ? '\\u0DB8\\u0DD6\\u0DBD\\u0DB0\\u0DCF\\u0DAD\\u0DD4' : 'Your Elements'}</Text>
            <Text style={sty.secSub}>{T ? '\\u0D94\\u0DB6\\u0D9C\\u0DDA \\u0DB8\\u0DD6\\u0DBD\\u0DB0\\u0DCF\\u0DAD\\u0DD4 \\u0DC4\\u0DB8\\u0DD4\\u0DC0\\u0DB1 \\u0DC0\\u0DD2\\u0DA7' : 'When your elements collide'}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
          <View style={sty.elemCard}>
            <View style={[sty.elemCircle, { backgroundColor: brideEl.color + '18', borderColor: brideEl.color + '40' }]}>
              <Ionicons name={brideEl.icon} size={24} color={brideEl.color} />
            </View>
            <Text style={[sty.elemName, { color: brideEl.color }]}>{T ? brideEl.si : be.dominant}</Text>
            <Text style={sty.elemWho}>{T ? '\\u0D94\\u0DB6' : 'Her'}</Text>
          </View>
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 8 }}>
            <Ionicons name="flash" size={20} color="rgba(255,184,0,0.6)" />
          </View>
          <View style={sty.elemCard}>
            <View style={[sty.elemCircle, { backgroundColor: groomEl.color + '18', borderColor: groomEl.color + '40' }]}>
              <Ionicons name={groomEl.icon} size={24} color={groomEl.color} />
            </View>
            <Text style={[sty.elemName, { color: groomEl.color }]}>{T ? groomEl.si : ge.dominant}</Text>
            <Text style={sty.elemWho}>{T ? '\\u0D94\\u0DC4\\u0DD4' : 'Him'}</Text>
          </View>
        </View>
        <Text style={sty.elemMetaphor}>{metaphor}</Text>
      </Glass>
    </Animated.View>
  );
}`;

// ─── 2. MAGNETISM 5-FACTOR CARD (replaces AttractionCard) ───
var magnetismCard = `
// ======= MAGNETISM 5-FACTOR CARD =======
function MagnetismCard({ data, language }) {
  var mag = data.magnetism;
  if (!mag || !mag.totalScore) return null;
  var T = language === 'si';
  var score = mag.totalScore;
  var max = mag.maxScore || 10;

  var FACTOR_META = {
    'Venus-Mars Spark': { icon: 'flame', color: '#F97316', label: T ? '\\u0DC0\\u0DD2\\u0DC2\\u0DBA \\u0D86\\u0DC0\\u0DDA\\u0D9C\\u0DBA' : 'Physical Spark' },
    '7th House Resonance': { icon: 'home', color: '#A78BFA', label: T ? '\\u0DC4\\u0DCF\\u0DAD\\u0DCA\\u0DB4\\u0DAD\\u0DD2 \\u0DC4\\u0DD0\\u0D9F\\u0DD3\\u0DB8' : 'Partnership Fit' },
    'Nakshatra Lord Affinity': { icon: 'star', color: '#FBBF24', label: T ? '\\u0DB1\\u0DD0\\u0D9A\\u0DAD\\u0DCA \\u0D9C\\u0DD0\\u0DBD\\u0DB4\\u0DD3\\u0DB8' : 'Star Alignment' },
    'Rahu-Ketu Karmic Axis': { icon: 'infinite', color: '#C084FC', label: T ? '\\u0D9A\\u0DBB\\u0DCA\\u0DB8 \\u0DB6\\u0DB3\\u0DB1\\u0DBA' : 'Fated Connection' },
    'Moon Emotional Sync': { icon: 'moon', color: '#22D3EE', label: T ? '\\u0DC4\\u0DD0\\u0D9F\\u0DD3\\u0DB8\\u0DCA \\u0DC3\\u0DB8\\u0DB1\\u0DCA\\u0DC0\\u0DBA' : 'Emotional Sync' },
  };

  var factors = mag.factors || [];

  return (
    <Animated.View entering={FadeInUp.delay(800).duration(700)}>
      <Glass style={sty.section}>
        <View style={sty.secHeader}>
          <View style={{ flex: 1 }}>
            <Text style={sty.secTitle}><Ionicons name="magnet" size={15} color="#F472B6" /> {T ? '\\u0D86\\u0D9A\\u0DBB\\u0DCA\\u0DC2\\u0DAB\\u0DBA' : 'Magnetism'}</Text>
            <Text style={sty.secSub}>{T ? '\\u0D94\\u0DB6 \\u0DAF\\u0DD9\\u0DAF\\u0DD9\\u0DB1\\u0DCF \\u0D85\\u0DAD\\u0DBB \\u0DC0\\u0DD2\\u0DAF\\u0DCA\\u0DBA\\u0DD4\\u0DAD\\u0DCA \\u0D86\\u0D9A\\u0DBB\\u0DCA\\u0DC2\\u0DAB\\u0DBA' : '5 forces pulling you together'}</Text>
          </View>
          <View style={[sty.factorScorePill, { backgroundColor: 'rgba(244,114,182,0.12)', borderColor: 'rgba(244,114,182,0.28)' }]}>
            <Text style={[sty.factorScoreText, { color: '#F472B6' }]}>{score}/{max}</Text>
          </View>
        </View>
        {factors.length > 0 ? factors.map(function(fac, i) {
          var meta = FACTOR_META[fac.nameEn] || { icon: 'ellipse', color: '#FFB800', label: fac.nameEn || fac.nameSi || 'Factor' };
          var pct = fac.maxScore > 0 ? fac.score / fac.maxScore : 0;
          var barColor = pct >= 0.7 ? '#34D399' : pct >= 0.4 ? '#FFB800' : '#F87171';
          return (
            <View key={i} style={sty.magRow}>
              <View style={[sty.magIcon, { backgroundColor: meta.color + '14', borderColor: meta.color + '30' }]}>
                <Ionicons name={meta.icon} size={15} color={meta.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={sty.magLabel}>{T ? (fac.nameSi || meta.label) : meta.label}</Text>
                <View style={sty.magBarBg}>
                  <View style={[sty.magBarFill, { width: (pct * 100) + '%', backgroundColor: barColor }]} />
                </View>
              </View>
              <Text style={[sty.magScore, { color: barColor }]}>{fac.score}/{fac.maxScore}</Text>
            </View>
          );
        }) : (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
            <View style={sty.chemPill}>
              <Ionicons name="flame" size={16} color="#F97316" />
              <Text style={sty.chemLabel}>{T ? '\\u0D86\\u0DC0\\u0DDA\\u0D9C\\u0DBA' : 'Passion'}</Text>
            </View>
            <View style={sty.chemPill}>
              <Ionicons name="heart" size={16} color="#34D399" />
              <Text style={sty.chemLabel}>{T ? '\\u0D86\\u0DAF\\u0DBB\\u0DBA' : 'Love'}</Text>
            </View>
            <View style={sty.chemPill}>
              <Ionicons name="moon" size={16} color="#60A5FA" />
              <Text style={sty.chemLabel}>{T ? '\\u0DC4\\u0DD0\\u0D9F\\u0DD3\\u0DB8\\u0DCA' : 'Emotional'}</Text>
            </View>
          </View>
        )}
        {mag.summary && (
          <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 10, textAlign: 'center', fontStyle: 'italic', lineHeight: 16 }}>
            {T ? (mag.summary.si || mag.summary.en) : mag.summary.en}
          </Text>
        )}
      </Glass>
    </Animated.View>
  );
}`;

// ─── 3. SOUL BLUEPRINT CARD ───
var soulCard = `
// ======= SOUL BLUEPRINT CARD =======
function SoulBlueprintCard({ data, language, bName, gName }) {
  var bj = data.brideAdvanced && data.brideAdvanced.tier1 && data.brideAdvanced.tier1.jaimini;
  var gj = data.groomAdvanced && data.groomAdvanced.tier1 && data.groomAdvanced.tier1.jaimini;
  if (!bj || !gj || !bj.atmakaraka || !gj.atmakaraka) return null;
  var T = language === 'si';

  var PLANET_DRIVE = {
    Sun: { drive: T ? '\\u0DB1\\u0DCF\\u0DBA\\u0D9A\\u0DAD\\u0DCA\\u0DC0\\u0DBA' : 'Leadership & recognition', icon: 'sunny', color: '#F97316' },
    Moon: { drive: T ? '\\u0DC4\\u0DD0\\u0D9F\\u0DD3\\u0DB8\\u0DCA \\u0DC3\\u0DD4\\u0DBB\\u0D9A\\u0DCA\\u0DC2\\u0DD2\\u0DAD\\u0DAD\\u0DCF\\u0DC0' : 'Emotional security & nurturing', icon: 'moon', color: '#93C5FD' },
    Mars: { drive: T ? '\\u0DC0\\u0DD3\\u0DBB\\u0DAD\\u0DCA\\u0DC0\\u0DBA \\u0DC4\\u0DCF \\u0DA2\\u0DBA\\u0D9C\\u0DCA\\u200D\\u0DBB\\u0DC4\\u0DAB\\u0DBA' : 'Courage & conquest', icon: 'flame', color: '#EF4444' },
    Mercury: { drive: T ? '\\u0DB6\\u0DD4\\u0DAF\\u0DCA\\u0DB0\\u0DD2\\u0DBA \\u0DC4\\u0DCF \\u0DC3\\u0DB1\\u0DCA\\u0DB1\\u0DD2\\u0DC0\\u0DDA\\u0DAF\\u0DB1\\u0DBA' : 'Intellect & communication', icon: 'chatbubbles', color: '#34D399' },
    Jupiter: { drive: T ? '\\u0DB1\\u0DD2\\u0DAF\\u0DC4\\u0DC3 \\u0DC4\\u0DCF \\u0DC0\\u0DD2\\u0DC3\\u0DCA\\u0DAD\\u0DBB\\u0DAB\\u0DBA' : 'Freedom & expansion', icon: 'globe', color: '#FBBF24' },
    Venus: { drive: T ? '\\u0D86\\u0DAF\\u0DBB\\u0DBA \\u0DC4\\u0DCF \\u0DC3\\u0DD4\\u0DB1\\u0DCA\\u0DAF\\u0DBB\\u0DBA' : 'Love & beauty', icon: 'heart', color: '#F472B6' },
    Saturn: { drive: T ? '\\u0DC3\\u0DCA\\u0DAD\\u0DD2\\u0DBB\\u0DAD\\u0DCF\\u0DC0 \\u0DC4\\u0DCF \\u0DC0\\u0DD2\\u0DB1\\u0DBA' : 'Stability & discipline', icon: 'shield', color: '#A78BFA' },
    Rahu: { drive: T ? '\\u0DB4\\u0DBB\\u0DD2\\u0DC0\\u0DBB\\u0DCA\\u0DAD\\u0DB1\\u0DBA \\u0DC4\\u0DCF \\u0D85\\u0DB1\\u0DCF\\u0D9C\\u0DAD\\u0DBA' : 'Transformation & ambition', icon: 'rocket', color: '#FB923C' },
    Ketu: { drive: T ? '\\u0D86\\u0DB0\\u0DCA\\u200D\\u0DBA\\u0DCF\\u0DAD\\u0DCA\\u0DB8\\u0DD2\\u0D9A \\u0DB8\\u0DD4\\u0D9A\\u0DCA\\u0DAD\\u0DD2\\u0DBA' : 'Spiritual liberation', icon: 'eye', color: '#22D3EE' },
  };

  var bp = PLANET_DRIVE[bj.atmakaraka] || { drive: bj.atmakaraka, icon: 'star', color: '#FFB800' };
  var gp = PLANET_DRIVE[gj.atmakaraka] || { drive: gj.atmakaraka, icon: 'star', color: '#FFB800' };

  return (
    <Animated.View entering={FadeInUp.delay(950).duration(700)}>
      <Glass style={sty.section}>
        <View style={sty.secHeader}>
          <View>
            <Text style={sty.secTitle}><Ionicons name="finger-print" size={15} color="#C084FC" /> {T ? '\\u0D86\\u0DAD\\u0DCA\\u0DB8 \\u0DB1\\u0DD2\\u0DBB\\u0DD4\\u0DB4\\u0DAB\\u0DBA' : 'Soul Blueprint'}</Text>
            <Text style={sty.secSub}>{T ? '\\u0D94\\u0DB6\\u0D9C\\u0DDA \\u0D86\\u0DAD\\u0DCA\\u0DB8\\u0DBA\\u0DB1\\u0DCA \\u0D9A\\u0DD2\\u0DBA \\u0DC3\\u0DD0\\u0DB6\\u0DD0\\u0DC0\\u0DD2\\u0DB1\\u0DCA \\u0D9A\\u0DD0\\u0DB8\\u0DAD\\u0DD2\\u0DBA\\u0DD2' : 'What each soul truly craves'}</Text>
          </View>
        </View>
        <View style={{ gap: 12, marginTop: 4 }}>
          <View style={sty.soulRow}>
            <View style={[sty.soulIcon, { backgroundColor: bp.color + '15', borderColor: bp.color + '35' }]}>
              <Ionicons name={bp.icon} size={18} color={bp.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={sty.soulWho}>{bName || (T ? '\\u0D94\\u0DB6' : 'Her')}</Text>
              <Text style={sty.soulDrive}>{bp.drive}</Text>
            </View>
            <Text style={[sty.soulPlanet, { color: bp.color }]}>{bj.atmakaraka}</Text>
          </View>
          <View style={sty.soulRow}>
            <View style={[sty.soulIcon, { backgroundColor: gp.color + '15', borderColor: gp.color + '35' }]}>
              <Ionicons name={gp.icon} size={18} color={gp.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={sty.soulWho}>{gName || (T ? '\\u0D94\\u0DC4\\u0DD4' : 'Him')}</Text>
              <Text style={sty.soulDrive}>{gp.drive}</Text>
            </View>
            <Text style={[sty.soulPlanet, { color: gp.color }]}>{gj.atmakaraka}</Text>
          </View>
        </View>
        {bj.atmakaraka !== gj.atmakaraka && (
          <View style={sty.soulSynth}>
            <Ionicons name="git-merge" size={14} color="rgba(255,184,0,0.7)" />
            <Text style={sty.soulSynthText}>
              {T ? '\\u0D94\\u0DB6\\u0D9C\\u0DDA \\u0D86\\u0DAD\\u0DCA\\u0DB8\\u0DBA\\u0DB1\\u0DCA \\u0D91\\u0D9A\\u0DB8\\u0DD9\\u0D9A\\u0DA7 \\u0DC3\\u0DB8\\u0DAD\\u0DD4\\u0DBD\\u0DD2\\u0DAD \\u0D9A\\u0DBB\\u0DBA\\u0DD2' 
                : bp.drive.split(' & ')[0] + ' meets ' + gp.drive.split(' & ')[0].toLowerCase() + ' \\u2014 you balance what the other lacks'}
            </Text>
          </View>
        )}
      </Glass>
    </Animated.View>
  );
}`;

// ─── 4. PAST LIVES CARD ───
var pastLivesCard = `
// ======= PAST LIVES CARD =======
function PastLivesCard({ data, language, bName, gName }) {
  var bpl = data.brideAdvanced && data.brideAdvanced.tier3 && data.brideAdvanced.tier3.pastLife;
  var gpl = data.groomAdvanced && data.groomAdvanced.tier3 && data.groomAdvanced.tier3.pastLife;
  if (!bpl || !gpl) return null;
  var T = language === 'si';

  var ARCHETYPE_META = {
    healer: { icon: 'medkit', color: '#34D399', en: 'Healer', si: '\\u0DC4\\u0DD3\\u0DBD\\u0DBB\\u0DCA' },
    warrior: { icon: 'shield', color: '#EF4444', en: 'Warrior', si: '\\u0DBA\\u0DD4\\u0DAF\\u0DCA\\u0DB0\\u0DBA\\u0DCF' },
    teacher: { icon: 'book', color: '#FBBF24', en: 'Teacher', si: '\\u0D9C\\u0DD4\\u0DBB\\u0DD4' },
    artist: { icon: 'color-palette', color: '#F472B6', en: 'Artist', si: '\\u0D9A\\u0DBD\\u0DCF\\u0D9A\\u0DBB\\u0DD4' },
    leader: { icon: 'flag', color: '#F97316', en: 'Leader', si: '\\u0DB1\\u0DCF\\u0DBA\\u0D9A' },
    mystic: { icon: 'eye', color: '#C084FC', en: 'Mystic', si: '\\u0DB8\\u0DCA\\u0DBA\\u0DC3\\u0DCA\\u0DA7\\u0DD2\\u0D9A\\u0DCA' },
    merchant: { icon: 'cash', color: '#A3E635', en: 'Merchant', si: '\\u0DC0\\u0DCA\\u200D\\u0DBA\\u0DCF\\u0DB4\\u0DCF\\u0DBB\\u0DD2' },
    scholar: { icon: 'library', color: '#60A5FA', en: 'Scholar', si: '\\u0DC0\\u0DD2\\u0DAF\\u0DCA\\u0DC0\\u0DAD\\u0DCF' },
    caretaker: { icon: 'heart', color: '#FB923C', en: 'Caretaker', si: '\\u0DBB\\u0D9A\\u0DCA\\u0DC2\\u0D9A' },
    explorer: { icon: 'compass', color: '#22D3EE', en: 'Explorer', si: '\\u0D9C\\u0DC0\\u0DDA\\u0DC2\\u0D9A' },
  };

  var getArch = function(pl) {
    if (!pl || !pl.ketuThemes) return { icon: 'help-circle', color: '#FFB800', en: 'Unknown', si: '\\u0D85\\u0DB1\\u0DAD\\u0DD2\\u0DAD' };
    var key = (pl.ketuThemes.archetype || '').toLowerCase();
    return ARCHETYPE_META[key] || { icon: 'star', color: '#FFB800', en: pl.ketuThemes.archetype || 'Seeker', si: pl.ketuThemes.archetype || '\\u0DC3\\u0DD9\\u0DC0\\u0DD4\\u0DB8\\u0DCA\\u0D9A\\u0DBB\\u0DD4' };
  };

  var ba = getArch(bpl);
  var ga = getArch(gpl);

  // Generate narrative
  var narrative = T
    ? ba.si + ' \\u0DC4\\u0DCF ' + ga.si + ' \\u0DB1\\u0DD0\\u0DC0\\u0DAD \\u0DC4\\u0DB8\\u0DD4\\u0DC0\\u0DD3\\u0DB8'
    : 'A ' + ba.en.toLowerCase() + ' and a ' + ga.en.toLowerCase() + ' reunited \\u2014 picking up where past lives left off';

  var karmaNote = '';
  if (bpl.karmaBalance && gpl.karmaBalance) {
    var bk = String(bpl.karmaBalance).toLowerCase();
    var gk = String(gpl.karmaBalance).toLowerCase();
    if (bk.indexOf('positive') !== -1 && gk.indexOf('positive') !== -1) {
      karmaNote = T ? '\\u0DAF\\u0DD9\\u0DAF\\u0DD9\\u0DB1\\u0DCF\\u0DB8 \\u0DC1\\u0DD4\\u0DB7 \\u0D9A\\u0DBB\\u0DCA\\u0DB8' : 'Both carry positive karma into this connection';
    } else if (bk.indexOf('negative') !== -1 || gk.indexOf('negative') !== -1) {
      karmaNote = T ? '\\u0DB4\\u0DD2\\u0DBB\\u0DD2\\u0DC3\\u0DD2\\u0DAF\\u0DD4 \\u0D9A\\u0DBB\\u0DB1\\u0DD4 \\u0DBD\\u0DB6\\u0DB1 \\u0D9A\\u0DBB\\u0DCA\\u0DB8' : 'Unresolved karma to work through \\u2014 growth awaits';
    } else {
      karmaNote = T ? '\\u0DB8\\u0DD2\\u0DC1\\u0DCA\\u200D\\u0DBB \\u0D9A\\u0DBB\\u0DCA\\u0DB8' : 'Mixed karma \\u2014 some lessons, some gifts';
    }
  }

  return (
    <Animated.View entering={FadeInUp.delay(1050).duration(700)}>
      <Glass style={sty.section}>
        <View style={sty.secHeader}>
          <View>
            <Text style={sty.secTitle}><Ionicons name="time" size={15} color="#C084FC" /> {T ? '\\u0DB4\\u0DD6\\u0DBB\\u0DCA\\u0DC0 \\u0DA2\\u0DD3\\u0DC0\\u0DD2\\u0DAD' : 'Past Lives'}</Text>
            <Text style={sty.secSub}>{T ? '\\u0D94\\u0DB6\\u0D9C\\u0DDA \\u0D86\\u0DAD\\u0DCA\\u0DB8\\u0DBA\\u0DB1\\u0DCA \\u0DB4\\u0DD6\\u0DBB\\u0DCA\\u0DC0\\u0DBA\\u0DD9\\u0DB1\\u0DCA \\u0DAF\\u0DB1\\u0DD3' : 'Your souls have met before'}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
          <View style={sty.pastCard}>
            <View style={[sty.pastIcon, { backgroundColor: ba.color + '15', borderColor: ba.color + '35' }]}>
              <Ionicons name={ba.icon} size={20} color={ba.color} />
            </View>
            <Text style={sty.pastWho}>{bName || (T ? '\\u0D94\\u0DB6' : 'Her')}</Text>
            <Text style={[sty.pastArch, { color: ba.color }]}>{T ? ba.si : ba.en}</Text>
          </View>
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="infinite" size={22} color="rgba(192,132,252,0.6)" />
          </View>
          <View style={sty.pastCard}>
            <View style={[sty.pastIcon, { backgroundColor: ga.color + '15', borderColor: ga.color + '35' }]}>
              <Ionicons name={ga.icon} size={20} color={ga.color} />
            </View>
            <Text style={sty.pastWho}>{gName || (T ? '\\u0D94\\u0DC4\\u0DD4' : 'Him')}</Text>
            <Text style={[sty.pastArch, { color: ga.color }]}>{T ? ga.si : ga.en}</Text>
          </View>
        </View>
        <Text style={sty.pastNarrative}>{narrative}</Text>
        {karmaNote.length > 0 && (
          <View style={sty.pastKarma}>
            <Ionicons name="leaf" size={12} color="rgba(255,184,0,0.6)" />
            <Text style={sty.pastKarmaText}>{karmaNote}</Text>
          </View>
        )}
      </Glass>
    </Animated.View>
  );
}`;

// ─── 5. RED FLAG CHECK CARD ───
var redFlagCard = `
// ======= RED FLAG CHECK CARD =======
function RedFlagCard({ data, language, bName, gName }) {
  var jm = data.jyotishMatching;
  if (!jm) return null;
  var bMangal = jm.brideMangalDosha;
  var gMangal = jm.groomMangalDosha;
  if (!bMangal && !gMangal) return null;
  var T = language === 'si';

  var getFlag = function(dosha) {
    if (!dosha || !dosha.hasDosha) return { status: 'clear', icon: 'checkmark-circle', color: '#34D399', label: T ? '\\u0DB4\\u0DD2\\u0DBB\\u0DD2\\u0DC3\\u0DD2\\u0DAF\\u0DD4\\u0DBA\\u0DD2' : 'Clear' };
    if (dosha.isHigh) return { status: 'high', icon: 'alert-circle', color: '#F87171', label: T ? '\\u0DB4\\u0DCA\\u200D\\u0DBB\\u0DB6\\u0DBD' : 'Present' };
    return { status: 'mild', icon: 'alert-circle', color: '#FFB800', label: T ? '\\u0DC3\\u0DD4\\u0DBD\\u0DD4' : 'Mild' };
  };

  var bf = getFlag(bMangal);
  var gf = getFlag(gMangal);
  var bothClear = bf.status === 'clear' && gf.status === 'clear';
  var bothHave = bf.status !== 'clear' && gf.status !== 'clear';

  var verdict = bothClear
    ? (T ? '\\u0D9A\\u0DD2\\u0DC3\\u0DD2\\u0DAF\\u0DD4 \\u0DBB\\u0DAD\\u0DD4 \\u0D9A\\u0DAB\\u0DCA\\u0DA9\\u0DD4\\u0DC0\\u0D9A\\u0DCA \\u0DB1\\u0DD0\\u0DAD' : 'No red flags detected \\u2014 smooth sailing')
    : bothHave
    ? (T ? '\\u0DAF\\u0DD9\\u0DAF\\u0DD9\\u0DB1\\u0DCF\\u0DB8 \\u0D85\\u0DB7\\u0DD2\\u0DBA\\u0DDD\\u0D9C \\u0DAD\\u0DD2\\u0DB6\\u0DD9 \\u2014 \\u0DC3\\u0DB8\\u0DAD\\u0DD4\\u0DBD\\u0DD2\\u0DAD \\u0DC0\\u0DDA' : 'Both carry the same tension marker \\u2014 these cancel each other out')
    : (T ? '\\u0D91\\u0D9A\\u0DCA \\u0D9A\\u0DD9\\u0DB1\\u0D9A\\u0DD4\\u0DA7 \\u0D85\\u0DB7\\u0DD2\\u0DBA\\u0DDD\\u0D9C \\u0DAD\\u0DD2\\u0DB6\\u0DD9' : 'One person carries a tension marker \\u2014 awareness is key');

  return (
    <Animated.View entering={FadeInUp.delay(1150).duration(700)}>
      <Glass style={sty.section}>
        <View style={sty.secHeader}>
          <View>
            <Text style={sty.secTitle}><Ionicons name="flag" size={15} color={bothClear ? '#34D399' : '#F87171'} /> {T ? '\\u0DBB\\u0DAD\\u0DD4 \\u0D9A\\u0DAB\\u0DCA\\u0DA9\\u0DD4 \\u0DB4\\u0DBB\\u0DD3\\u0D9A\\u0DCA\\u0DC2\\u0DCF\\u0DC0' : 'Red Flag Check'}</Text>
            <Text style={sty.secSub}>{T ? '\\u0DC3\\u0DB8\\u0DCA\\u0DB4\\u0DCA\\u200D\\u0DBB\\u0DAF\\u0DCF\\u0DBA\\u0DD2\\u0D9A \\u0DC0\\u0DD2\\u0DC0\\u0DCF\\u0DC4 \\u0D85\\u0DB7\\u0DD2\\u0DBA\\u0DDD\\u0D9C' : 'Traditional marriage tension markers'}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
          <View style={sty.flagPerson}>
            <Ionicons name={bf.icon} size={22} color={bf.color} />
            <Text style={sty.flagName}>{bName || (T ? '\\u0D94\\u0DB6' : 'Her')}</Text>
            <Text style={[sty.flagLabel, { color: bf.color }]}>{bf.label}</Text>
          </View>
          <View style={sty.flagPerson}>
            <Ionicons name={gf.icon} size={22} color={gf.color} />
            <Text style={sty.flagName}>{gName || (T ? '\\u0D94\\u0DC4\\u0DD4' : 'Him')}</Text>
            <Text style={[sty.flagLabel, { color: gf.color }]}>{gf.label}</Text>
          </View>
        </View>
        <Text style={sty.flagVerdict}>{verdict}</Text>
      </Glass>
    </Animated.View>
  );
}`;

// ─── 6. TIMING & PRESSURE CARD ───
var timingCard = `
// ======= TIMING & PRESSURE CARD =======
function TimingCard({ data, language, bName, gName }) {
  var jm = data.jyotishMatching;
  if (!jm) return null;
  var bss = jm.brideSadeSati;
  var gss = jm.groomSadeSati;
  if (!bss && !gss) return null;
  var T = language === 'si';

  var getStatus = function(ss) {
    if (!ss || !ss.status) return null;
    var s = String(ss.status).toLowerCase();
    if (s.indexOf('active') !== -1 || s.indexOf('yes') !== -1 || s === 'true') return { active: true, icon: 'thunderstorm', color: '#F97316', label: T ? '\\u0DC3\\u0D9A\\u0DCA\\u200D\\u0DBB\\u0DD2\\u0DBA' : 'In Pressure Phase' };
    return { active: false, icon: 'sunny', color: '#34D399', label: T ? '\\u0DB4\\u0DD2\\u0DBB\\u0DD2\\u0DC3\\u0DD2\\u0DAF\\u0DD4\\u0DBA\\u0DD2' : 'Clear Skies' };
  };

  var bs = getStatus(bss);
  var gs = getStatus(gss);
  if (!bs && !gs) return null;

  var bothClear = bs && gs && !bs.active && !gs.active;
  var anyPressure = (bs && bs.active) || (gs && gs.active);

  var advice = bothClear
    ? (T ? '\\u0DAF\\u0DD9\\u0DAF\\u0DD9\\u0DB1\\u0DCF\\u0DB8 \\u0DC4\\u0DCF\\u0DB1\\u0DD2 \\u0D9A\\u0DCF\\u0DBD\\u0DBA\\u0D9A' : 'Both in a clear period \\u2014 great timing for big decisions')
    : anyPressure
    ? (T ? '\\u0DB4\\u0DD3\\u0DA9\\u0DB1\\u0DBA \\u0DAD\\u0DCF\\u0DC0\\u0D9A\\u0DCF\\u0DBD\\u0DD2\\u0D9A\\u0DBA\\u0DD2 \\u2014 \\u0D89\\u0DC0\\u0DC3\\u0DD3\\u0DB8 \\u0DC0\\u0DD0\\u0DA9\\u0DD2\\u0DBA' : 'Pressure is temporary \\u2014 extra patience and support make all the difference')
    : '';

  return (
    <Animated.View entering={FadeInUp.delay(1200).duration(700)}>
      <Glass style={sty.section}>
        <View style={sty.secHeader}>
          <View>
            <Text style={sty.secTitle}><Ionicons name="hourglass" size={15} color="#FB923C" /> {T ? '\\u0D9A\\u0DCF\\u0DBD\\u0DBA \\u0DC4\\u0DCF \\u0DB4\\u0DD3\\u0DA9\\u0DB1\\u0DBA' : 'Timing & Pressure'}</Text>
            <Text style={sty.secSub}>{T ? '\\u0DAD\\u0DCF\\u0DC0\\u0D9A\\u0DCF\\u0DBD\\u0DD2\\u0D9A \\u0DA2\\u0DD3\\u0DC0\\u0DD2\\u0DAD \\u0DB4\\u0DD3\\u0DA9\\u0DB1' : 'Life pressure that affects relationships'}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
          {bs && (
            <View style={sty.timingPerson}>
              <View style={[sty.timingBadge, { backgroundColor: bs.color + '12', borderColor: bs.color + '30' }]}>
                <Ionicons name={bs.icon} size={20} color={bs.color} />
              </View>
              <Text style={sty.timingName}>{bName || (T ? '\\u0D94\\u0DB6' : 'Her')}</Text>
              <Text style={[sty.timingLabel, { color: bs.color }]}>{bs.label}</Text>
            </View>
          )}
          {gs && (
            <View style={sty.timingPerson}>
              <View style={[sty.timingBadge, { backgroundColor: gs.color + '12', borderColor: gs.color + '30' }]}>
                <Ionicons name={gs.icon} size={20} color={gs.color} />
              </View>
              <Text style={sty.timingName}>{gName || (T ? '\\u0D94\\u0DC4\\u0DD4' : 'Him')}</Text>
              <Text style={[sty.timingLabel, { color: gs.color }]}>{gs.label}</Text>
            </View>
          )}
        </View>
        {advice.length > 0 && (
          <Text style={sty.timingAdvice}>{advice}</Text>
        )}
      </Glass>
    </Animated.View>
  );
}`;

// ─── INSERT ALL COMPONENTS ───
// Insert before StrengthsCard function
var insertPoint = 'function StrengthsCard(';
var idx = f.indexOf(insertPoint);
if (idx !== -1) {
  var allCards = elementsCard + '\n' + magnetismCard + '\n' + soulCard + '\n' + pastLivesCard + '\n' + redFlagCard + '\n' + timingCard + '\n\n';
  f = f.substring(0, idx) + allCards + f.substring(idx);
  console.log('OK: Inserted 6 new card components');
} else {
  console.log('ERROR: Could not find StrengthsCard insertion point');
  process.exit(1);
}

// ─── REMOVE OLD AttractionCard USAGE AND REPLACE WITH MagnetismCard ───
f = f.replace('{/* Attraction & Chemistry */}\n            <AttractionCard data={data} language={language} />', '{/* Magnetism */}\n            <MagnetismCard data={data} language={language} />');
// Also try \r\n variant
f = f.replace('{/* Attraction & Chemistry */}\r\n            <AttractionCard data={data} language={language} />', '{/* Magnetism */}\r\n            <MagnetismCard data={data} language={language} />');
console.log('OK: Replaced AttractionCard with MagnetismCard in render');

// ─── REORDER SECTIONS ───
// Current order: StarProfiles → Factors → Strengths → Challenges → Magnetism → DeeperConnection → Divider → Wedding
// Target: StarProfiles → Elements → Factors → Magnetism → Strengths → SoulBlueprint → PastLives → Challenges → RedFlags → Timing → DeeperConnection → Divider → Wedding

// Insert ElementsCard after StarProfiles
var starProfilesLine = '<StarProfilesCard data={data} language={language} bName={bName} gName={gName} />';
var spIdx = f.indexOf(starProfilesLine);
if (spIdx !== -1) {
  var afterSP = spIdx + starProfilesLine.length;
  var elementsRender = '\n\n            {/* Your Elements */}\n            <ElementsCard data={data} language={language} />';
  f = f.substring(0, afterSP) + elementsRender + f.substring(afterSP);
  console.log('OK: Wired ElementsCard after StarProfiles');
}

// Move Magnetism before Strengths (currently after Challenges)
// Remove from current position
var magOld = /\n\s*\{\/\* Magnetism \*\/\}\s*\n\s*<MagnetismCard data=\{data\} language=\{language\} \/>/;
var magMatch = f.match(magOld);
if (magMatch) {
  f = f.replace(magOld, '');
  // Insert before Strengths
  var strengthsRender = '{/* Your Strengths */}';
  var stIdx = f.indexOf(strengthsRender);
  if (stIdx !== -1) {
    var magInsert = '\n            {/* Magnetism */}\n            <MagnetismCard data={data} language={language} />\n\n            ';
    f = f.substring(0, stIdx) + magInsert + f.substring(stIdx);
    console.log('OK: Moved Magnetism before Strengths');
  }
}

// Insert SoulBlueprint + PastLives after Strengths, before Challenges
var challengesRender = '{/* Watch Out For */}';
var chIdx = f.indexOf(challengesRender);
if (chIdx !== -1) {
  var soulPastInsert = '{/* Soul Blueprint */}\n            <SoulBlueprintCard data={data} language={language} bName={bName} gName={gName} />\n\n            {/* Past Lives */}\n            <PastLivesCard data={data} language={language} bName={bName} gName={gName} />\n\n            ';
  f = f.substring(0, chIdx) + soulPastInsert + f.substring(chIdx);
  console.log('OK: Inserted SoulBlueprint + PastLives before Challenges');
}

// Insert RedFlags + Timing after Challenges, before DeeperConnection
var deeperRender = '{/* Deeper Connection */}';
var dcIdx = f.indexOf(deeperRender);
if (dcIdx !== -1) {
  var redTimingInsert = '{/* Red Flag Check */}\n            <RedFlagCard data={data} language={language} bName={bName} gName={gName} />\n\n            {/* Timing & Pressure */}\n            <TimingCard data={data} language={language} bName={bName} gName={gName} />\n\n            ';
  f = f.substring(0, dcIdx) + redTimingInsert + f.substring(dcIdx);
  console.log('OK: Inserted RedFlags + Timing before DeeperConnection');
}

// ─── ADD STYLES ───
var styleAnchor = '  deepBadgeText: { fontSize: 11, fontWeight: \'900\' },';
var saIdx = f.indexOf(styleAnchor);
if (saIdx !== -1) {
  var afterAnchor = saIdx + styleAnchor.length;
  var newStyles = `

  // ─── Elements card ───
  elemCard: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  elemCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  elemName: { fontSize: 15, fontWeight: '900' },
  elemWho: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  elemMetaphor: { fontSize: 12, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 14, fontStyle: 'italic', lineHeight: 18, paddingHorizontal: 8 },

  // ─── Magnetism 5-factor ───
  magRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  magIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  magLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  magBarBg: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  magBarFill: { height: 5, borderRadius: 3 },
  magScore: { fontSize: 11, fontWeight: '900', minWidth: 28, textAlign: 'right' },

  // ─── Soul Blueprint ───
  soulRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  soulIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  soulWho: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '700' },
  soulDrive: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 2 },
  soulPlanet: { fontSize: 10, fontWeight: '900', opacity: 0.7 },
  soulSynth: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,184,0,0.12)' },
  soulSynthText: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.55)', fontStyle: 'italic', lineHeight: 17 },

  // ─── Past Lives ───
  pastCard: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: 'rgba(192,132,252,0.04)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(192,132,252,0.12)' },
  pastIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  pastWho: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '700' },
  pastArch: { fontSize: 14, fontWeight: '900' },
  pastNarrative: { fontSize: 12, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 14, fontStyle: 'italic', lineHeight: 18 },
  pastKarma: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,184,0,0.08)' },
  pastKarmaText: { flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 15 },

  // ─── Red Flag ───
  flagPerson: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  flagName: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '700' },
  flagLabel: { fontSize: 13, fontWeight: '900' },
  flagVerdict: { fontSize: 12, color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginTop: 12, fontStyle: 'italic', lineHeight: 17 },

  // ─── Timing & Pressure ───
  timingPerson: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  timingBadge: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  timingName: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '700' },
  timingLabel: { fontSize: 12, fontWeight: '800' },
  timingAdvice: { fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 12, fontStyle: 'italic', lineHeight: 17 },`;

  f = f.substring(0, afterAnchor) + newStyles + f.substring(afterAnchor);
  console.log('OK: Added all new styles');
}

fs.writeFileSync('mobile/app/(tabs)/porondam.js', f);
console.log('\nALL DONE - 6 new spicy cards implemented!');
