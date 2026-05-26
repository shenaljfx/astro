var fs = require('fs');
var f = fs.readFileSync('mobile/app/(tabs)/porondam.js', 'utf8');

// ─── 1. Replace getCompatibilityFactorCopy function ───
var oldFnStart = 'function getCompatibilityFactorCopy(name, language) {';
var oldFnEnd = "return { label: selected[0], desc: selected[1] };\r\n}";

var startIdx = f.indexOf(oldFnStart);
var endIdx = f.indexOf(oldFnEnd, startIdx);
if (startIdx === -1 || endIdx === -1) { console.log('ERROR: Could not find getCompatibilityFactorCopy'); process.exit(1); }
endIdx += oldFnEnd.length;

var newFn = `function getCompatibilityFactorCopy(name, language, score, maxScore) {
  var pct = maxScore > 0 ? score / maxScore : 0;
  var tier = pct >= 0.75 ? 'good' : pct >= 0.25 ? 'mixed' : 'poor';

  var factors = {
    Dina: {
      plainName: { en: 'Daily Life Together', si: '\\u0DAF\\u0DD2\\u0DB1\\u0DB4\\u0DAD\\u0DCF \\u0D91\\u0D9A\\u0DAD\\u0DD4\\u0DC0' },
      techName: { en: 'Dina Porondam', si: '\\u0DAF\\u0DD2\\u0DB1 \\u0DB4\\u0DDC\\u0DBB\\u0DDC\\u0DB1\\u0DCA\\u0DAF\\u0DB8' },
      good: { en: 'Your everyday rhythms sync naturally \\u2014 mornings, meals, and moods will feel easy together.', si: '\\u0D94\\u0DB6\\u0DBD\\u0DCF\\u0D9C\\u0DDA \\u0DAF\\u0DD2\\u0DB1\\u0DB4\\u0DAD\\u0DCF \\u0DBB\\u0DA7\\u0DCF \\u0DC3\\u0DCA\\u0DC0\\u0DCF\\u0DB7\\u0DCF\\u0DC0\\u0DD2\\u0D9A\\u0DC0 \\u0D9C\\u0DD0\\u0DBD\\u0DB4\\u0DDA \\u2014 \\u0D8B\\u0DAF\\u0DDA, \\u0D86\\u0DC4\\u0DCF\\u0DBB, \\u0DB8\\u0DB1\\u0DD0\\u0DC3\\u0DCA\\u0DAE\\u0DD2\\u0DAD\\u0DD2 \\u0DB4\\u0DC4\\u0DC3\\u0DD4\\u0DC0\\u0DD9\\u0DB1\\u0DCA \\u0DBA\\u0DB1\\u0DD4.' },
      mixed: { en: 'Some daily habits may differ \\u2014 small compromises around routines will keep things smooth.', si: '\\u0DC3\\u0DB8\\u0DC4\\u0DBB \\u0DAF\\u0DD2\\u0DB1\\u0DB4\\u0DAD\\u0DCF \\u0DB4\\u0DD4\\u0DBB\\u0DD4\\u0DAF\\u0DD4 \\u0DC0\\u0DD9\\u0DB1\\u0DC3\\u0DCA \\u0DC0\\u0DD2\\u0DBA \\u0DC4\\u0DD0\\u0D9A \\u2014 \\u0D9A\\u0DD4\\u0DA9\\u0DCF \\u0D86\\u0DAF\\u0DDA\\u0DC1\\u0DBA\\u0DB1\\u0DCA \\u0DC3\\u0DB8\\u0D9F \\u0DC3\\u0DD4\\u0D9C\\u0DB8\\u0DBA\\u0DD2.' },
      poor: { en: 'Very different daily rhythms \\u2014 one of you may feel drained. Talk about expectations early.', si: '\\u0DAF\\u0DD2\\u0DB1\\u0DB4\\u0DAD\\u0DCF \\u0DBB\\u0DA7\\u0DCF \\u0DC0\\u0DD9\\u0DB1\\u0DC3\\u0DCA \\u2014 \\u0D91\\u0D9A\\u0DCA \\u0D85\\u0DBA\\u0D9A\\u0DD4\\u0DA7 \\u0DB8\\u0DAF\\u0DD2 \\u0DC0\\u0DD2\\u0DBA \\u0DC4\\u0DD0\\u0D9A. \\u0D89\\u0D9A\\u0DCA\\u0DB8\\u0DB1\\u0DD2\\u0DB1\\u0DCA \\u0D85\\u0DB4\\u0DDA\\u0D9A\\u0DCA\\u0DC2\\u0DCF \\u0D9A\\u0DAD\\u0DCF \\u0D9A\\u0DBB\\u0DB1\\u0DCA\\u0DB1.' },
    },
    Gana: {
      plainName: { en: 'How You Handle Conflict', si: '\\u0D9C\\u0DD0\\u0DA7\\u0DD4\\u0DB8\\u0DCA \\u0DC4\\u0DD0\\u0DB1\\u0DCA\\u0DAF\\u0DBD\\u0DB1 \\u0D86\\u0D9A\\u0DCF\\u0DBB\\u0DBA' },
      techName: { en: 'Gana Porondam', si: '\\u0D9C\\u0DAB \\u0DB4\\u0DDC\\u0DBB\\u0DDC\\u0DB1\\u0DCA\\u0DAF\\u0DB8' },
      good: { en: 'You handle stress and disagreements the same way \\u2014 fights resolve quickly.', si: '\\u0D94\\u0DB6 \\u0DAF\\u0DD9\\u0DAF\\u0DD9\\u0DB1\\u0DCF \\u0DB4\\u0DD3\\u0DA9\\u0DB1\\u0DBA \\u0DC3\\u0DB8\\u0DCF\\u0DB1 \\u0D86\\u0D9A\\u0DCF\\u0DBB\\u0DBA\\u0D9A\\u0DD2\\u0DB1\\u0DCA \\u0DC4\\u0DD0\\u0DC3\\u0DD2\\u0DBB\\u0DDA \\u2014 \\u0D9C\\u0DD0\\u0DA7\\u0DD4\\u0DB8\\u0DCA \\u0D89\\u0D9A\\u0DCA\\u0DB8\\u0DB1\\u0DD2\\u0DB1\\u0DCA \\u0DB1\\u0DD2\\u0DB8\\u0DCF\\u0DC0\\u0DDA.' },
      mixed: { en: 'You react differently under stress \\u2014 understanding each other\\u2019s triggers helps.', si: '\\u0DB4\\u0DD3\\u0DA9\\u0DB1\\u0DBA\\u0DA7 \\u0DC0\\u0DD9\\u0DB1\\u0DC3\\u0DCA \\u0DB4\\u0DCA\\u200D\\u0DBB\\u0DAD\\u0DD2\\u0D9A\\u0DCA\\u200D\\u0DBB\\u0DD2\\u0DBA\\u0DCF \\u0D9A\\u0DBB\\u0DBA\\u0DD2 \\u2014 \\u0D91\\u0D9A\\u0DD2\\u0DB1\\u0DD9\\u0D9A\\u0DCF\\u0D9C\\u0DDA \\u0DAD\\u0DD3\\u0DBB\\u0DAB \\u0DAD\\u0DD9\\u0DBB\\u0DD4\\u0DB8\\u0DCA\\u0D9C\\u0DD0\\u0DB1\\u0DD3\\u0DB8 \\u0DC0\\u0DD0\\u0DAF\\u0D9C\\u0DAD\\u0DCA.' },
      poor: { en: 'Very different temperaments \\u2014 one stays calm while the other reacts strongly. Patience is essential.', si: '\\u0DC3\\u0DCA\\u0DC0\\u0DB7\\u0DCF\\u0DC0\\u0DBA\\u0DB1\\u0DCA \\u0DC0\\u0DD9\\u0DB1\\u0DC3\\u0DCA \\u2014 \\u0D91\\u0D9A\\u0DCA \\u0D85\\u0DBA \\u0DC3\\u0DD2\\u0DC4\\u0DD2\\u0DBA\\u0DD9\\u0DB1\\u0DCA \\u0D85\\u0DB1\\u0DD9\\u0D9A\\u0DCF \\u0DAD\\u0DD3\\u0DC0\\u0DCA\\u200D\\u0DBB \\u0DB4\\u0DCA\\u200D\\u0DBB\\u0DAD\\u0DD2\\u0D9A\\u0DCA\\u200D\\u0DBB\\u0DD2\\u0DBA\\u0DCF \\u0D9A\\u0DBB\\u0DBA\\u0DD2. \\u0D89\\u0DC0\\u0DC3\\u0DD3\\u0DB8 \\u0D85\\u0DAD\\u0DCA\\u200D\\u0DBA\\u0DC0\\u0DC1\\u0DCA\\u200D\\u0DBA\\u0DBA\\u0DD2.' },
    },
    Yoni: {
      plainName: { en: 'Physical & Emotional Chemistry', si: '\\u0DC1\\u0DCF\\u0DBB\\u0DD3\\u0DBB\\u0DD2\\u0D9A \\u0DC4\\u0DCF \\u0DC4\\u0DD0\\u0D9F\\u0DD3\\u0DB8\\u0DCA \\u0D9C\\u0DD0\\u0DBD\\u0DB4\\u0DD3\\u0DB8' },
      techName: { en: 'Yoni Porondam', si: '\\u0DBA\\u0DDD\\u0DB1\\u0DD2 \\u0DB4\\u0DDC\\u0DBB\\u0DDC\\u0DB1\\u0DCA\\u0DAF\\u0DB8' },
      good: { en: 'Strong natural attraction \\u2014 physical connection and emotional closeness come easily.', si: '\\u0DC3\\u0DCA\\u0DC0\\u0DCF\\u0DB7\\u0DCF\\u0DC0\\u0DD2\\u0D9A \\u0D86\\u0D9A\\u0DBB\\u0DCA\\u0DC2\\u0DAB\\u0DBA \\u0DB4\\u0DCA\\u200D\\u0DBB\\u0DB6\\u0DBD \\u2014 \\u0DC1\\u0DCF\\u0DBB\\u0DD3\\u0DBB\\u0DD2\\u0D9A \\u0DC3\\u0DB8\\u0DD3\\u0DB4\\u0DAD\\u0DCF\\u0DC0 \\u0DC4\\u0DCF \\u0DC4\\u0DD0\\u0D9F\\u0DD3\\u0DB8\\u0DCA \\u0DB4\\u0DC4\\u0DC3\\u0DD4\\u0DC0\\u0DD9\\u0DB1\\u0DCA \\u0DBA\\u0DB1\\u0DD4.' },
      mixed: { en: 'Moderate chemistry \\u2014 attraction is there but needs effort to keep the spark alive over time.', si: '\\u0DB8\\u0DB0\\u0DCA\\u200D\\u0DBA\\u0DB8 \\u0D86\\u0D9A\\u0DBB\\u0DCA\\u0DC2\\u0DAB\\u0DBA \\u2014 \\u0D9A\\u0DCF\\u0DBD\\u0DBA\\u0DCF \\u0DC3\\u0DB8\\u0D9F \\u0DB4\\u0DD0\\u0DC0\\u0DAD\\u0DD3\\u0DB8\\u0DA7 \\u0D8B\\u0DAD\\u0DCA\\u0DC3\\u0DCF\\u0DC4\\u0DBA \\u0D95\\u0DB1\\u0DBA.' },
      poor: { en: 'Low natural chemistry \\u2014 intimacy may need open conversations about needs.', si: '\\u0DC3\\u0DCA\\u0DC0\\u0DCF\\u0DB7\\u0DCF\\u0DC0\\u0DD2\\u0D9A \\u0D86\\u0D9A\\u0DBB\\u0DCA\\u0DC2\\u0DAB\\u0DBA \\u0D85\\u0DA9\\u0DD4 \\u2014 \\u0D85\\u0DC0\\u0DC1\\u0DCA\\u200D\\u0DBA\\u0DAD\\u0DCF \\u0D9C\\u0DD0\\u0DB1 \\u0DC0\\u0DD2\\u0DC0\\u0DD8\\u0DAD \\u0DC3\\u0DB1\\u0DCA\\u0DB1\\u0DD2\\u0DC0\\u0DDA\\u0DAF\\u0DB1\\u0DBA \\u0DC0\\u0DD0\\u0DAF\\u0D9C\\u0DAD\\u0DCA.' },
    },
    Rashi: {
      plainName: { en: 'Emotional Understanding', si: '\\u0DC4\\u0DD0\\u0D9F\\u0DD3\\u0DB8\\u0DCA \\u0DAD\\u0DD9\\u0DBB\\u0DD4\\u0DB8\\u0DCA \\u0D9C\\u0DD0\\u0DB1\\u0DD3\\u0DB8' },
      techName: { en: 'Rashi Porondam', si: '\\u0DBB\\u0DCF\\u0DC1\\u0DD2 \\u0DB4\\u0DDC\\u0DBB\\u0DDC\\u0DB1\\u0DCA\\u0DAF\\u0DB8' },
      good: { en: 'You understand each other\\u2019s emotions intuitively \\u2014 home life will feel harmonious.', si: '\\u0D94\\u0DB6 \\u0D91\\u0D9A\\u0DD2\\u0DB1\\u0DD9\\u0D9A\\u0DCF\\u0D9C\\u0DDA \\u0DC4\\u0DD0\\u0D9F\\u0DD3\\u0DB8\\u0DCA \\u0DC3\\u0DCA\\u0DC0\\u0DCF\\u0DB7\\u0DCF\\u0DC0\\u0DD2\\u0D9A\\u0DC0 \\u0DAD\\u0DD9\\u0DBB\\u0DD4\\u0DB8\\u0DCA \\u0D9C\\u0DB1\\u0DD3 \\u2014 \\u0D9C\\u0DD8\\u0DC4 \\u0DA2\\u0DD3\\u0DC0\\u0DD2\\u0DAD\\u0DBA \\u0DC3\\u0DB8\\u0D9C\\u0DD2\\u0DBA\\u0DD2.' },
      mixed: { en: 'You feel things differently \\u2014 give each other space to process emotions their own way.', si: '\\u0D94\\u0DB6 \\u0DC4\\u0DD0\\u0D9F\\u0DD3\\u0DB8\\u0DCA \\u0DC0\\u0DD9\\u0DB1\\u0DC3\\u0DCA \\u0D85\\u0DB1\\u0DD4\\u0DB7\\u0DC0 \\u0D9A\\u0DBB\\u0DBA\\u0DD2 \\u2014 \\u0D91\\u0D9A\\u0DD2\\u0DB1\\u0DD9\\u0D9A\\u0DCF\\u0DA7 \\u0D89\\u0DA9\\u0DB8\\u0DCA \\u0DAF\\u0DD9\\u0DB1\\u0DCA\\u0DB1.' },
      poor: { en: 'Emotional wavelengths are quite different \\u2014 misunderstandings likely without effort.', si: '\\u0DC4\\u0DD0\\u0D9F\\u0DD3\\u0DB8\\u0DCA \\u0DAD\\u0DBB\\u0D82\\u0D9C \\u0DC0\\u0DD9\\u0DB1\\u0DC3\\u0DCA \\u2014 \\u0D8B\\u0DAD\\u0DCA\\u0DC3\\u0DCF\\u0DC4\\u0DBA\\u0D9A\\u0DD2\\u0DB1\\u0DCA \\u0DAD\\u0DDC\\u0DBB\\u0DC0 \\u0DC0\\u0DD0\\u0DBB\\u0DAF\\u0DD3 \\u0DAD\\u0DD3\\u0DBB\\u0DD4\\u0DB8\\u0DCA \\u0DC0\\u0DD2\\u0DBA \\u0DC4\\u0DD0\\u0D9A.' },
    },
    Vasya: {
      plainName: { en: 'Natural Pull & Influence', si: '\\u0DC3\\u0DCA\\u0DC0\\u0DCF\\u0DB7\\u0DCF\\u0DC0\\u0DD2\\u0D9A \\u0D86\\u0D9A\\u0DBB\\u0DCA\\u0DC2\\u0DAB\\u0DBA' },
      techName: { en: 'Vasya Porondam', si: '\\u0DC0\\u0DCF\\u0DC1\\u0DCA\\u200D\\u0DBA \\u0DB4\\u0DDC\\u0DBB\\u0DDC\\u0DB1\\u0DCA\\u0DAF\\u0DB8' },
      good: { en: 'Strong mutual pull \\u2014 you naturally respond to and influence each other positively.', si: '\\u0DB4\\u0DCA\\u200D\\u0DBB\\u0DB6\\u0DBD \\u0D86\\u0D9A\\u0DBB\\u0DCA\\u0DC2\\u0DAB\\u0DBA \\u2014 \\u0D94\\u0DB6 \\u0DC3\\u0DCA\\u0DC0\\u0DCF\\u0DB7\\u0DCF\\u0DC0\\u0DD2\\u0D9A\\u0DC0 \\u0D91\\u0D9A\\u0DD2\\u0DB1\\u0DD9\\u0D9A\\u0DCF\\u0DA7 \\u0DB7\\u0DCF\\u0DC0\\u0DCF\\u0DAD\\u0DCA\\u0DB8\\u0D9A\\u0DC0 \\u0DB4\\u0DCA\\u200D\\u0DBB\\u0DAD\\u0DD2\\u0D9A\\u0DCA\\u200D\\u0DBB\\u0DD2\\u0DBA\\u0DCF \\u0D9A\\u0DBB\\u0DBA\\u0DD2.' },
      mixed: { en: 'The pull exists but isn\\u2019t overwhelming \\u2014 neither dominates the other.', si: '\\u0D86\\u0D9A\\u0DBB\\u0DCA\\u0DC2\\u0DAB\\u0DBA \\u0DAD\\u0DD2\\u0DB6\\u0DD4\\u0DAB\\u0DAD\\u0DCA \\u0DB4\\u0DCA\\u200D\\u0DBB\\u0DB6\\u0DBD \\u0DB1\\u0DD0\\u0DAD \\u2014 \\u0D9A\\u0DD9\\u0DB1\\u0DD9\\u0D9A\\u0DD4\\u0DAD\\u0DCA \\u0D85\\u0DB1\\u0DD9\\u0D9A\\u0DCF\\u0DA7 \\u0D86\\u0DB0\\u0DD2\\u0DB4\\u0DAD\\u0DCA\\u200D\\u0DBA \\u0DB1\\u0DDC\\u0D9A\\u0DBB\\u0DBA\\u0DD2.' },
      poor: { en: 'Low natural magnetism \\u2014 the bond needs conscious nurturing to stay connected.', si: '\\u0DC3\\u0DCA\\u0DC0\\u0DCF\\u0DB7\\u0DCF\\u0DC0\\u0DD2\\u0D9A \\u0D86\\u0D9A\\u0DBB\\u0DCA\\u0DC2\\u0DAB\\u0DBA \\u0D85\\u0DA9\\u0DD4 \\u2014 \\u0DC3\\u0DB6\\u0DB3\\u0DAD\\u0DCF\\u0DC0 \\u0DB4\\u0DD0\\u0DC0\\u0DAD\\u0DD3\\u0DB8\\u0DA7 \\u0DC3\\u0DD0\\u0DBD\\u0D9A\\u0DD2\\u0DBD\\u0DCA\\u0DBD\\u0DC0\\u0DAD\\u0DCA \\u0DB4\\u0DDC\\u0DC2\\u0DAB\\u0DBA \\u0D95\\u0DB1\\u0DBA.' },
    },
    Nadi: {
      plainName: { en: 'Long-term Family Health', si: '\\u0DAF\\u0DD3\\u0DBB\\u0DCA\\u0D9C\\u0D9A\\u0DCF\\u0DBD\\u0DD3\\u0DB1 \\u0DB4\\u0DC0\\u0DD4\\u0DBD\\u0DCA \\u0DC3\\u0DD4\\u0DC0\\u0DBA' },
      techName: { en: 'Nadi Porondam', si: '\\u0DB1\\u0DCF\\u0DA9\\u0DD2 \\u0DB4\\u0DDC\\u0DBB\\u0DDC\\u0DB1\\u0DCA\\u0DAF\\u0DB8' },
      good: { en: 'Excellent health alignment \\u2014 your family will thrive with natural vitality.', si: '\\u0DC3\\u0DD4\\u0DC0\\u0DBA \\u0D9C\\u0DD0\\u0DBD\\u0DB4\\u0DD3\\u0DB8 \\u0D89\\u0DAD\\u0DCF \\u0DC4\\u0DDC\\u0DB3\\u0DBA\\u0DD2 \\u2014 \\u0D94\\u0DB6\\u0D9C\\u0DDA \\u0DB4\\u0DC0\\u0DD4\\u0DBD \\u0DC3\\u0DCA\\u0DC0\\u0DCF\\u0DB7\\u0DCF\\u0DC0\\u0DD2\\u0D9A \\u0DC3\\u0DD4\\u0DC0\\u0DBA\\u0DD9\\u0DB1\\u0DCA \\u0DC0\\u0DD0\\u0DA9\\u0DD2\\u0DC0\\u0DDA.' },
      mixed: { en: 'Moderate health alignment \\u2014 some care needed around family wellness habits.', si: '\\u0DB8\\u0DB0\\u0DCA\\u200D\\u0DBA\\u0DB8 \\u0DC3\\u0DD4\\u0DC0\\u0DBA \\u0D9C\\u0DD0\\u0DBD\\u0DB4\\u0DD3\\u0DB8 \\u2014 \\u0DB4\\u0DC0\\u0DD4\\u0DBD\\u0DDA \\u0DC3\\u0DD4\\u0DC0\\u0DBA \\u0DB4\\u0DD4\\u0DBB\\u0DD4\\u0DAF\\u0DD4 \\u0D9C\\u0DD0\\u0DB1 \\u0DC3\\u0DD0\\u0DBD\\u0D9A\\u0DD2\\u0DBD\\u0DCA\\u0DBD \\u0DC0\\u0DD3\\u0DB8 \\u0DC4\\u0DDC\\u0DB3\\u0DBA\\u0DD2.' },
      poor: { en: 'Health patterns don\\u2019t align well \\u2014 prioritize regular check-ups and discuss family health history.', si: '\\u0DC3\\u0DD4\\u0DC0\\u0DBA \\u0DBB\\u0DA7\\u0DCF \\u0D9C\\u0DD0\\u0DBD\\u0DB4\\u0DD3\\u0DB8 \\u0D85\\u0DA9\\u0DD4 \\u2014 \\u0DB1\\u0DD2\\u0DBA\\u0DB8\\u0DD2\\u0DAD \\u0DC3\\u0DD4\\u0DC0\\u0DBA \\u0DB4\\u0DBB\\u0DD3\\u0D9A\\u0DCA\\u0DC2\\u0DCF \\u0D9A\\u0DBB\\u0DB1\\u0DCA\\u0DB1. \\u0DB4\\u0DC0\\u0DD4\\u0DBD\\u0DDA \\u0DC3\\u0DD4\\u0DC0\\u0DBA \\u0D89\\u0DAD\\u0DD2\\u0DC4\\u0DCF\\u0DC3\\u0DBA \\u0DC3\\u0DCF\\u0D9A\\u0DA0\\u0DCA\\u0DA1\\u0DCF \\u0D9A\\u0DBB\\u0DB1\\u0DCA\\u0DB1.' },
    },
    Mahendra: {
      plainName: { en: 'Growth & Prosperity Together', si: '\\u0D91\\u0D9A\\u0DA7 \\u0DC0\\u0DD0\\u0DA9\\u0DD3\\u0DB8 \\u0DC4\\u0DCF \\u0DC3\\u0DB8\\u0DD8\\u0DAF\\u0DCA\\u0DB0\\u0DD2\\u0DBA' },
      techName: { en: 'Mahendra Porondam', si: '\\u0DB8\\u0DC4\\u0DDA\\u0DB1\\u0DCA\\u0DAF\\u0DCA\\u200D\\u0DBB \\u0DB4\\u0DDC\\u0DBB\\u0DDC\\u0DB1\\u0DCA\\u0DAF\\u0DB8' },
      good: { en: 'This relationship naturally supports prosperity \\u2014 you\\u2019ll grow together.', si: '\\u0DB8\\u0DDA \\u0DC3\\u0DB6\\u0DB3\\u0DAD\\u0DCF\\u0DC0 \\u0DC3\\u0DB8\\u0DD8\\u0DAF\\u0DCA\\u0DB0\\u0DD2\\u0DBA\\u0DA7 \\u0DC3\\u0DCA\\u0DC0\\u0DCF\\u0DB7\\u0DCF\\u0DC0\\u0DD2\\u0D9A\\u0DC0 \\u0DC3\\u0DC4\\u0DCF\\u0DBA \\u0DC0\\u0DDA \\u2014 \\u0D94\\u0DB6 \\u0D91\\u0D9A\\u0DA7 \\u0DC0\\u0DD0\\u0DA9\\u0DD3.' },
      mixed: { en: 'Growth support is neutral \\u2014 success will come from combined effort.', si: '\\u0DC0\\u0DD0\\u0DA9\\u0DD3\\u0DB8\\u0DDA \\u0DC3\\u0DC4\\u0DCF\\u0DBA \\u0DB8\\u0DB0\\u0DCA\\u200D\\u0DBA\\u0DB8 \\u2014 \\u0DAD\\u0DB1\\u0DD2 \\u0DAD\\u0DB1\\u0DD2\\u0DC0 \\u0D8B\\u0DAD\\u0DCA\\u0DC3\\u0DCF\\u0DC4\\u0DBA\\u0DD9\\u0DB1\\u0DCA \\u0DC3\\u0DCF\\u0DBB\\u0DCA\\u0DAE\\u0D9A\\u0DAD\\u0DCA\\u0DC0\\u0DBA \\u0DBD\\u0DD0\\u0DB6\\u0DDA.' },
      poor: { en: 'Growth energy doesn\\u2019t naturally combine \\u2014 actively support each other\\u2019s goals.', si: '\\u0DC0\\u0DD0\\u0DA9\\u0DD3\\u0DB8\\u0DDA \\u0DC1\\u0D9A\\u0DCA\\u0DAD\\u0DD2\\u0DBA \\u0DC3\\u0DCA\\u0DC0\\u0DCF\\u0DB7\\u0DCF\\u0DC0\\u0DD2\\u0D9A\\u0DC0 \\u0D91\\u0D9A\\u0DAD\\u0DD4 \\u0DB1\\u0DDC\\u0DC0\\u0DDA \\u2014 \\u0D91\\u0D9A\\u0DD2\\u0DB1\\u0DD9\\u0D9A\\u0DCF\\u0D9C\\u0DDA \\u0D89\\u0DBD\\u0D9A\\u0DCA\\u0D9A \\u0DC3\\u0D9A\\u0DCA\\u200D\\u0DBB\\u0DD2\\u0DBA\\u0DC0 \\u0DC3\\u0DC4\\u0DCF\\u0DBA \\u0D9A\\u0DBB\\u0DB1\\u0DCA\\u0DB1.' },
    },
  };

  var fc = factors[name];
  if (!fc) {
    return { plainName: name, techName: name + ' Porondam', insight: '', tier: tier };
  }
  var lang = language === 'si' ? 'si' : 'en';
  return {
    plainName: fc.plainName[lang],
    techName: fc.techName[lang],
    insight: fc[tier][lang],
    tier: tier,
  };
}`;

f = f.substring(0, startIdx) + newFn + f.substring(endIdx);

// ─── 2. Rewrite FactorBar component ───
var oldFactorBar = 'function FactorBar({ f, index, language }) {';
var factorBarStart = f.indexOf(oldFactorBar);
var factorBarEnd = f.indexOf('\n}\n', factorBarStart) + 3; // Find closing brace

var newFactorBar = `function FactorBar({ f, index, language }) {
  var pct = f.maxScore > 0 ? f.score / f.maxScore : 0;
  var copy = getCompatibilityFactorCopy(f.name, language, f.score, f.maxScore);
  var tier = copy.tier;
  var iconName = tier === 'good' ? 'checkmark-circle' : tier === 'mixed' ? 'alert-circle' : 'close-circle';
  var iconColor = tier === 'good' ? '#34D399' : tier === 'mixed' ? '#FFB800' : '#F87171';
  return (
    <Animated.View entering={FadeInUp.delay(100 * index).duration(500)} style={sty.factorItem}>
      <View style={sty.factorTop}>
        <View style={sty.factorNameRow}>
          <Ionicons name={iconName} size={20} color={iconColor} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={sty.factorName}>{copy.plainName}</Text>
            <Text style={sty.factorTech}>{copy.techName} \\u00B7 {f.score}/{f.maxScore}</Text>
          </View>
        </View>
      </View>
      {copy.insight ? <Text style={sty.factorInsight}>{copy.insight}</Text> : null}
    </Animated.View>
  );
}
`;

f = f.substring(0, factorBarStart) + newFactorBar + f.substring(factorBarEnd);

// ─── 3. Add new styles for factorTech and factorInsight ───
var styInsertPoint = f.indexOf('factorDesc:');
if (styInsertPoint !== -1) {
  var lineEnd = f.indexOf('\n', styInsertPoint);
  // Find end of factorDesc style block
  var braceCount = 0;
  var i = styInsertPoint;
  while (i < f.length) {
    if (f[i] === '{') braceCount++;
    if (f[i] === '}') { braceCount--; if (braceCount === 0) break; }
    i++;
  }
  var afterFactorDesc = f.indexOf(',', i) + 1;
  f = f.substring(0, afterFactorDesc) + `
  factorTech: { color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 },
  factorInsight: { color: 'rgba(255,232,176,0.85)', fontSize: 12, lineHeight: 18, marginTop: 8, paddingLeft: 30 },` + f.substring(afterFactorDesc);
}

fs.writeFileSync('mobile/app/(tabs)/porondam.js', f);
console.log('Done! Factor bars redesigned with dynamic copy.');
