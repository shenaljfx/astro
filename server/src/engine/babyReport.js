/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BABY KENDARA REPORT ENGINE — the complete newborn keepsake
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Composes the FULL paid Baby Kendara Pack (SKU baby_kendara). Everything is
 * deterministic (no AI calls), so a purchased compose always succeeds.
 *
 * Sections produced by buildBabyReport():
 *   birthMoment     — panchanga snapshot of the birth instant (weekday, tithi…)
 *   planets         — 9 graha positions with Sinhala names + degrees
 *   starProfile     — nakshatra personality: deity/symbol/gana/yoni + curated
 *                     baby nature, gift and parenting note (si + en)
 *   naming          — traditional Sri Lankan avakahada letters for all 4 padas
 *                     (baby's pada flagged) + curated Sinhala name ideas
 *   doshas          — Ganda Moola + Gandanta, explained with remedies (si + en)
 *   elements        — fire/earth/air/water balance across the 9 grahas
 *   lucky           — colour / day / gem / guardian planet
 *   childhoodDashas — the first 3 vimshottari periods with child-age framing
 *
 * The Sinhala copy uses the premium ඔබ register and explains astrological
 * terms in brackets, matching the app's onboarding voice.
 */

const {
  RASHIS,
  getAllPlanetPositions,
  toSidereal, getMoonLongitude,
  getNakshatra, getPanchanga,
  calculateVimshottariDetailed,
} = require('./astrology');
const { GANA_MAP, YONI_MAP } = require('./porondam');
const { formatLocalDateTime } = require('./calculationSettings');

let enhanced = null;
try { enhanced = require('./enhanced'); } catch (e) { console.warn('[babyReport] enhanced engine unavailable:', e.message); }


// ═══════════════════════════════════════════════════════════════════════════
//  TRADITIONAL SINHALA NAMING LETTERS (අවකහඩ චක්‍රය)
//  Keyed by the engine's nakshatra names (astrology.js) — 27 × 4 padas.
// ═══════════════════════════════════════════════════════════════════════════

const NAMING_LETTERS = {
  'Ashwini':            [{ si: 'චු', ro: 'Chu' }, { si: 'චේ', ro: 'Che' }, { si: 'චෝ', ro: 'Cho' }, { si: 'ලා', ro: 'La' }],
  'Bharani':            [{ si: 'ලී', ro: 'Lee' }, { si: 'ලූ', ro: 'Lu' }, { si: 'ලේ', ro: 'Le' }, { si: 'ලෝ', ro: 'Lo' }],
  'Krittika':           [{ si: 'අ', ro: 'A' }, { si: 'ඉ', ro: 'I' }, { si: 'උ', ro: 'U' }, { si: 'ඒ', ro: 'E' }],
  'Rohini':             [{ si: 'ඕ', ro: 'O' }, { si: 'වා', ro: 'Va' }, { si: 'වී', ro: 'Vee' }, { si: 'වූ', ro: 'Vu' }],
  'Mrigashira':         [{ si: 'වේ', ro: 'Ve' }, { si: 'වෝ', ro: 'Vo' }, { si: 'කා', ro: 'Ka' }, { si: 'කී', ro: 'Kee' }],
  'Ardra':              [{ si: 'කූ', ro: 'Ku' }, { si: 'ඝ', ro: 'Gha' }, { si: 'ඞ', ro: 'Nga' }, { si: 'ඡ', ro: 'Chha' }],
  'Punarvasu':          [{ si: 'කේ', ro: 'Ke' }, { si: 'කෝ', ro: 'Ko' }, { si: 'හා', ro: 'Ha' }, { si: 'හී', ro: 'Hee' }],
  'Pushya':             [{ si: 'හූ', ro: 'Hu' }, { si: 'හේ', ro: 'He' }, { si: 'හෝ', ro: 'Ho' }, { si: 'ඩ', ro: 'Da' }],
  'Ashlesha':           [{ si: 'ඩී', ro: 'Dee' }, { si: 'ඩූ', ro: 'Du' }, { si: 'ඩේ', ro: 'De' }, { si: 'ඩෝ', ro: 'Do' }],
  'Magha':              [{ si: 'මා', ro: 'Ma' }, { si: 'මී', ro: 'Mee' }, { si: 'මූ', ro: 'Mu' }, { si: 'මේ', ro: 'Me' }],
  'Purva Phalguni':     [{ si: 'මෝ', ro: 'Mo' }, { si: 'ටා', ro: 'Ta' }, { si: 'ටී', ro: 'Tee' }, { si: 'ටූ', ro: 'Tu' }],
  'Uttara Phalguni':    [{ si: 'ටේ', ro: 'Te' }, { si: 'ටෝ', ro: 'To' }, { si: 'පා', ro: 'Pa' }, { si: 'පී', ro: 'Pee' }],
  'Hasta':              [{ si: 'පූ', ro: 'Pu' }, { si: 'ෂ', ro: 'Sha' }, { si: 'ණ', ro: 'Na' }, { si: 'ඨ', ro: 'Tha' }],
  'Chitra':             [{ si: 'පේ', ro: 'Pe' }, { si: 'පෝ', ro: 'Po' }, { si: 'රා', ro: 'Ra' }, { si: 'රී', ro: 'Ree' }],
  'Swati':              [{ si: 'රූ', ro: 'Ru' }, { si: 'රේ', ro: 'Re' }, { si: 'රෝ', ro: 'Ro' }, { si: 'තා', ro: 'Tha' }],
  'Vishakha':           [{ si: 'තී', ro: 'Thee' }, { si: 'තූ', ro: 'Thu' }, { si: 'තේ', ro: 'The' }, { si: 'තෝ', ro: 'Tho' }],
  'Anuradha':           [{ si: 'නා', ro: 'Na' }, { si: 'නී', ro: 'Nee' }, { si: 'නූ', ro: 'Nu' }, { si: 'නේ', ro: 'Ne' }],
  'Jyeshtha':           [{ si: 'නෝ', ro: 'No' }, { si: 'යා', ro: 'Ya' }, { si: 'යී', ro: 'Yee' }, { si: 'යූ', ro: 'Yu' }],
  'Mula':               [{ si: 'යේ', ro: 'Ye' }, { si: 'යෝ', ro: 'Yo' }, { si: 'භා', ro: 'Bha' }, { si: 'භී', ro: 'Bhee' }],
  'Purva Ashadha':      [{ si: 'භූ', ro: 'Bhu' }, { si: 'ධා', ro: 'Dha' }, { si: 'ඵා', ro: 'Pha' }, { si: 'ඪා', ro: 'Dhha' }],
  'Uttara Ashadha':     [{ si: 'භේ', ro: 'Bhe' }, { si: 'භෝ', ro: 'Bho' }, { si: 'ජා', ro: 'Ja' }, { si: 'ජී', ro: 'Jee' }],
  'Shravana':           [{ si: 'ජූ', ro: 'Ju' }, { si: 'ජේ', ro: 'Je' }, { si: 'ජෝ', ro: 'Jo' }, { si: 'ඝා', ro: 'Gha' }],
  'Dhanishtha':         [{ si: 'ගා', ro: 'Ga' }, { si: 'ගී', ro: 'Gee' }, { si: 'ගූ', ro: 'Gu' }, { si: 'ගේ', ro: 'Ge' }],
  'Shatabhisha':        [{ si: 'ගෝ', ro: 'Go' }, { si: 'සා', ro: 'Sa' }, { si: 'සී', ro: 'See' }, { si: 'සූ', ro: 'Su' }],
  'Purva Bhadrapada':   [{ si: 'සේ', ro: 'Se' }, { si: 'සෝ', ro: 'So' }, { si: 'දා', ro: 'Da' }, { si: 'දී', ro: 'Dee' }],
  'Uttara Bhadrapada':  [{ si: 'දූ', ro: 'Du' }, { si: 'ථ', ro: 'Tha' }, { si: 'ඣ', ro: 'Jha' }, { si: 'ඤ', ro: 'Nya' }],
  'Revati':             [{ si: 'දේ', ro: 'De' }, { si: 'දෝ', ro: 'Do' }, { si: 'චා', ro: 'Cha' }, { si: 'චී', ro: 'Chee' }],
};

// ── Curated modern Sri Lankan name ideas, keyed by the Sinhala pada letter ──
// Each entry: { m: [male], f: [female] } with { si, ro } pairs. Letters with a
// sparse pool stay honest (fewer or zero names) — the UI explains that any
// name honouring the sound is auspicious, which is the traditional practice.
const NAME_IDEAS = {
  'චු': { m: [{ si: 'චුලක්ෂ', ro: 'Chulaksha' }], f: [{ si: 'චුලක්ෂි', ro: 'Chulakshi' }, { si: 'චුලානි', ro: 'Chulani' }] },
  'චේ': { m: [{ si: 'චේතන', ro: 'Chethana' }, { si: 'චේතික', ro: 'Chethika' }], f: [{ si: 'චේතනා', ro: 'Chethana' }, { si: 'චේතනි', ro: 'Chethani' }] },
  'චෝ': { m: [], f: [] },
  'ලා': { m: [{ si: 'ලාහිරු', ro: 'Lahiru' }, { si: 'ලාවන්', ro: 'Lawan' }, { si: 'ලාසිත', ro: 'Lasitha' }], f: [{ si: 'ලාවන්‍යා', ro: 'Lavanya' }, { si: 'ලාසනි', ro: 'Lasani' }] },
  'ලී': { m: [{ si: 'ලිනුක', ro: 'Linuka' }, { si: 'ලිතුම්', ro: 'Lithum' }], f: [{ si: 'ලිහිණි', ro: 'Lihini' }, { si: 'ලීශා', ro: 'Leesha' }] },
  'ලූ': { m: [], f: [] },
  'ලේ': { m: [{ si: 'ලේනුල', ro: 'Lenula' }], f: [{ si: 'ලේඛා', ro: 'Lekha' }, { si: 'ලේශානි', ro: 'Leshani' }] },
  'ලෝ': { m: [{ si: 'ලෝහන්', ro: 'Lohan' }, { si: 'ලෝචන', ro: 'Lochana' }], f: [{ si: 'ලෝචනා', ro: 'Lochana' }] },
  'අ': { m: [{ si: 'අකිල', ro: 'Akila' }, { si: 'අශෙන්', ro: 'Ashen' }, { si: 'අනුජ', ro: 'Anuja' }, { si: 'අවින්ද', ro: 'Avinda' }], f: [{ si: 'අමායා', ro: 'Amaya' }, { si: 'අනුකි', ro: 'Anuki' }, { si: 'අශිනි', ro: 'Ashini' }, { si: 'අකිලා', ro: 'Akila' }] },
  'ඉ': { m: [{ si: 'ඉසුරු', ro: 'Isuru' }, { si: 'ඉෂාන්', ro: 'Ishan' }, { si: 'ඉමෙත්', ro: 'Imeth' }], f: [{ si: 'ඉමායා', ro: 'Imaya' }, { si: 'ඉෂිනි', ro: 'Ishini' }, { si: 'ඉමෂා', ro: 'Imasha' }] },
  'උ': { m: [{ si: 'උවිඳු', ro: 'Uvindu' }, { si: 'උදාර', ro: 'Udara' }, { si: 'උමේෂ', ro: 'Umesha' }], f: [{ si: 'උමාලි', ro: 'Umali' }, { si: 'උමයංගනා', ro: 'Umayangana' }] },
  'ඒ': { m: [{ si: 'එරන්ද', ro: 'Eranda' }, { si: 'එෂාන්', ro: 'Eshan' }], f: [{ si: 'එරන්දි', ro: 'Erandi' }, { si: 'එෂානි', ro: 'Eshani' }] },
  'ඕ': { m: [{ si: 'ඔසඳ', ro: 'Osanda' }, { si: 'ඔවින්', ro: 'Ovin' }], f: [{ si: 'ඕෂිනි', ro: 'Oshini' }, { si: 'ඔනාලි', ro: 'Onali' }] },
  'වා': { m: [{ si: 'වාසිත', ro: 'Wasitha' }], f: [{ si: 'වාසනා', ro: 'Wasana' }, { si: 'වාරුණි', ro: 'Waruni' }] },
  'වී': { m: [{ si: 'වීර', ro: 'Weera' }], f: [{ si: 'වීණා', ro: 'Veena' }] },
  'වූ': { m: [], f: [] },
  'වේ': { m: [{ si: 'වේනුර', ro: 'Venura' }], f: [{ si: 'වේනුරි', ro: 'Venuri' }] },
  'වෝ': { m: [], f: [] },
  'කා': { m: [{ si: 'කාවින්ද', ro: 'Kavinda' }, { si: 'කාවීෂ', ro: 'Kaveesha' }], f: [{ si: 'කාවින්ද්‍යා', ro: 'Kavindya' }, { si: 'කාව්‍යා', ro: 'Kavya' }, { si: 'කාවීෂා', ro: 'Kaveesha' }] },
  'කී': { m: [{ si: 'කීර්ති', ro: 'Keerthi' }], f: [{ si: 'කීර්තිකා', ro: 'Keerthika' }] },
  'කූ': { m: [], f: [] },
  'ඝ': { m: [], f: [] },
  'ඞ': { m: [], f: [] },
  'ඡ': { m: [], f: [{ si: 'ඡායා', ro: 'Chaya' }] },
  'කේ': { m: [{ si: 'කේෂාන්', ro: 'Keshan' }, { si: 'කේහාර', ro: 'Kehara' }], f: [{ si: 'කේශිනි', ro: 'Keshini' }, { si: 'කේෂලා', ro: 'Keshala' }] },
  'කෝ': { m: [{ si: 'කෝසල', ro: 'Kosala' }], f: [{ si: 'කෝමලී', ro: 'Komali' }] },
  'හා': { m: [{ si: 'හාරිත', ro: 'Haritha' }], f: [{ si: 'හාරිකා', ro: 'Harika' }] },
  'හී': { m: [], f: [] },
  'හූ': { m: [], f: [] },
  'හේ': { m: [{ si: 'හේෂාන්', ro: 'Heshan' }, { si: 'හේවීෂ', ro: 'Hevisha' }], f: [{ si: 'හේෂානි', ro: 'Heshani' }, { si: 'හේමාලි', ro: 'Hemali' }] },
  'හෝ': { m: [], f: [] },
  'ඩ': { m: [{ si: 'ඩිලාන්', ro: 'Dilan' }, { si: 'ඩිලුම්', ro: 'Dilum' }], f: [{ si: 'ඩිලානි', ro: 'Dilani' }] },
  'ඩී': { m: [{ si: 'ඩිලාන්', ro: 'Dilan' }], f: [{ si: 'ඩිලානි', ro: 'Dilani' }, { si: 'ඩිල්කි', ro: 'Dilki' }] },
  'ඩූ': { m: [], f: [] },
  'ඩේ': { m: [{ si: 'ඩේවින්', ro: 'Devin' }], f: [] },
  'ඩෝ': { m: [], f: [] },
  'මා': { m: [{ si: 'මාලක', ro: 'Malaka' }, { si: 'මාලිඳු', ro: 'Malindu' }, { si: 'මාධව', ro: 'Madhava' }], f: [{ si: 'මායුමි', ro: 'Mayumi' }, { si: 'මාලනී', ro: 'Malani' }, { si: 'මාෂි', ro: 'Mashi' }] },
  'මී': { m: [], f: [{ si: 'මීනා', ro: 'Meena' }] },
  'මූ': { m: [], f: [] },
  'මේ': { m: [{ si: 'මේනුක', ro: 'Menuka' }], f: [{ si: 'මේනකා', ro: 'Menaka' }, { si: 'මේධා', ro: 'Medha' }] },
  'මෝ': { m: [{ si: 'මෝහන්', ro: 'Mohan' }], f: [] },
  'ටා': { m: [], f: [] },
  'ටී': { m: [], f: [] },
  'ටූ': { m: [], f: [] },
  'ටේ': { m: [], f: [] },
  'ටෝ': { m: [], f: [] },
  'පා': { m: [{ si: 'පාසන්', ro: 'Pasan' }], f: [{ si: 'පාරමි', ro: 'Parami' }, { si: 'පාවනි', ro: 'Pavani' }] },
  'පී': { m: [{ si: 'පියුම්', ro: 'Piyum' }], f: [{ si: 'පියුමි', ro: 'Piyumi' }, { si: 'පියුමා', ro: 'Piyuma' }] },
  'පූ': { m: [{ si: 'පූජිත', ro: 'Poojitha' }], f: [{ si: 'පූජා', ro: 'Pooja' }, { si: 'පූර්ණිමා', ro: 'Poornima' }] },
  'ෂ': { m: [{ si: 'ෂෙහාන්', ro: 'Shehan' }, { si: 'ෂෙනාල්', ro: 'Shenal' }], f: [{ si: 'ෂෙනාලි', ro: 'Shenali' }, { si: 'ෂෙහාරා', ro: 'Shehara' }] },
  'ණ': { m: [], f: [] },
  'ඨ': { m: [], f: [] },
  'පේ': { m: [{ si: 'පේෂල', ro: 'Peshala' }], f: [{ si: 'පේෂලා', ro: 'Peshala' }] },
  'පෝ': { m: [], f: [] },
  'රා': { m: [{ si: 'රාහුල', ro: 'Rahula' }, { si: 'රාවින්', ro: 'Ravin' }], f: [{ si: 'රාධිකා', ro: 'Radhika' }] },
  'රී': { m: [], f: [{ si: 'රීශා', ro: 'Reesha' }] },
  'රූ': { m: [{ si: 'රුමේෂ', ro: 'Rumesh' }], f: [] },
  'රේ': { m: [{ si: 'රේණුක', ro: 'Renuka' }], f: [{ si: 'රේෂිකා', ro: 'Reshika' }] },
  'රෝ': { m: [{ si: 'රෝහණ', ro: 'Rohana' }, { si: 'රෝමේෂ', ro: 'Romesh' }], f: [{ si: 'රෝෂිනි', ro: 'Roshini' }, { si: 'රෝහිණී', ro: 'Rohini' }] },
  'තා': { m: [{ si: 'තාරක', ro: 'Tharaka' }, { si: 'තාරිඳු', ro: 'Tharindu' }], f: [{ si: 'තාරා', ro: 'Thara' }, { si: 'තාරුකා', ro: 'Tharuka' }] },
  'තී': { m: [], f: [] },
  'තූ': { m: [], f: [] },
  'තේ': { m: [{ si: 'තේනුක', ro: 'Thenuka' }, { si: 'තේජාන්', ro: 'Thejan' }], f: [{ si: 'තේනුකි', ro: 'Thenuki' }] },
  'තෝ': { m: [], f: [] },
  'නා': { m: [{ si: 'නාවින්', ro: 'Navin' }], f: [{ si: 'නාදුනි', ro: 'Naduni' }] },
  'නී': { m: [], f: [{ si: 'නීලා', ro: 'Neela' }] },
  'නූ': { m: [], f: [] },
  'නේ': { m: [{ si: 'නෙතුම්', ro: 'Nethum' }, { si: 'නෙතුල', ro: 'Nethula' }], f: [{ si: 'නෙතුලි', ro: 'Nethuli' }, { si: 'නේත්‍රා', ro: 'Nethra' }] },
  'නෝ': { m: [], f: [] },
  'යා': { m: [{ si: 'යසස්', ro: 'Yasas' }, { si: 'යසිරු', ro: 'Yasiru' }], f: [{ si: 'යසිරි', ro: 'Yasiri' }] },
  'යී': { m: [], f: [] },
  'යූ': { m: [{ si: 'යූෂාන්', ro: 'Yushan' }], f: [] },
  'යේ': { m: [], f: [] },
  'යෝ': { m: [{ si: 'යෝෂිත', ro: 'Yoshitha' }, { si: 'යෝහාන්', ro: 'Yohan' }], f: [{ si: 'යෝෂිනි', ro: 'Yoshini' }] },
  'භා': { m: [{ si: 'භාතිය', ro: 'Bhathiya' }], f: [{ si: 'භාග්‍යා', ro: 'Bhagya' }, { si: 'භාවනා', ro: 'Bhavana' }] },
  'භී': { m: [], f: [] },
  'භූ': { m: [], f: [] },
  'ධා': { m: [{ si: 'ධනුජ', ro: 'Dhanuja' }, { si: 'ධනුෂ්ක', ro: 'Dhanushka' }], f: [{ si: 'ධාරා', ro: 'Dhara' }] },
  'ඵා': { m: [], f: [] },
  'ඪා': { m: [], f: [] },
  'භේ': { m: [], f: [] },
  'භෝ': { m: [], f: [] },
  'ජා': { m: [{ si: 'ජාලිය', ro: 'Jaliya' }], f: [{ si: 'ජානවී', ro: 'Janavi' }] },
  'ජී': { m: [{ si: 'ජීවක', ro: 'Jeewaka' }, { si: 'ජීවන්', ro: 'Jeewan' }], f: [{ si: 'ජීවනී', ro: 'Jeewani' }] },
  'ජූ': { m: [], f: [] },
  'ජේ': { m: [], f: [] },
  'ජෝ': { m: [], f: [] },
  'ඝා': { m: [], f: [] },
  'ගා': { m: [{ si: 'ගාමිණී', ro: 'Gamini' }], f: [] },
  'ගී': { m: [], f: [{ si: 'ගීතිකා', ro: 'Geethika' }, { si: 'ගීතාංජලී', ro: 'Geethanjali' }] },
  'ගූ': { m: [], f: [] },
  'ගේ': { m: [], f: [] },
  'ගෝ': { m: [], f: [] },
  'සා': { m: [{ si: 'සාරංග', ro: 'Saranga' }, { si: 'සානුක', ro: 'Sanuka' }], f: [{ si: 'සාරා', ro: 'Sara' }, { si: 'සාවින්ද්‍යා', ro: 'Savindya' }] },
  'සී': { m: [], f: [] },
  'සූ': { m: [], f: [] },
  'සේ': { m: [{ si: 'සෙනුක', ro: 'Senuka' }, { si: 'සේනිත', ro: 'Senith' }], f: [{ si: 'සෙනාලි', ro: 'Senali' }] },
  'සෝ': { m: [], f: [] },
  'දා': { m: [{ si: 'දසුන්', ro: 'Dasun' }], f: [] },
  'දී': { m: [{ si: 'දිනුක', ro: 'Dinuka' }], f: [{ si: 'දිනිති', ro: 'Dinithi' }, { si: 'දිනුෂි', ro: 'Dinushi' }] },
  'දූ': { m: [], f: [] },
  'ථ': { m: [], f: [] },
  'ඣ': { m: [], f: [] },
  'ඤ': { m: [], f: [] },
  'දේ': { m: [{ si: 'දේශාන්', ro: 'Deshan' }], f: [{ si: 'දේශිනි', ro: 'Deshini' }] },
  'දෝ': { m: [], f: [] },
  'චා': { m: [{ si: 'චාමර', ro: 'Chamara' }, { si: 'චානක', ro: 'Chanaka' }], f: [{ si: 'චාරුනි', ro: 'Charuni' }, { si: 'චාරුකා', ro: 'Charuka' }] },
  'චී': { m: [], f: [] },
};


// ═══════════════════════════════════════════════════════════════════════════
//  NAKSHATRA BABY PROFILES — 27 curated personality entries (si + en)
// ═══════════════════════════════════════════════════════════════════════════

const NAKSHATRA_BABY_PROFILES = {
  'Ashwini': {
    symbolSi: 'අශ්ව හිස', symbolEn: "Horse's head",
    deitySi: 'අශ්විනී දෙව කුමරුවෝ (සුව කිරීමේ දෙවිවරු)', deityEn: 'Ashwini Kumaras (divine healers)',
    natureSi: 'අස්විද නැකතින් උපන් බිලිඳා ඉක්මන්, ජවසම්පන්න සහ නිර්භීත ස්වභාවයක් පෙන්වයි. අලුත් දේ ඉගෙන ගැනීමට ඇති කැමැත්ත කුඩා කාලයේම දැකගත හැකියි.',
    natureEn: 'A baby born under Ashwini shows a quick, energetic and fearless nature. Their love of learning new things appears very early.',
    giftSi: 'ඉක්මන් ක්‍රියාශීලී බව සහ අන් අයට උදව් කිරීමේ හදවත — සුව කිරීමේ හා සත්කාරයේ දක්ෂතාවක්.',
    giftEn: 'Speed, initiative and a helper\'s heart — a natural gift for healing and care.',
    parentSi: 'බිලිඳාගේ නොනවතින ශක්තියට ඉඩ දෙන්න; ක්‍රීඩාවට හා විවෘත පරිසරයට නිතර අවස්ථාව දෙන්න.',
    parentEn: 'Give this child room for their endless energy — regular play and open spaces help them thrive.',
  },
  'Bharani': {
    symbolSi: 'යෝනිය (නව ජීවයේ දොරටුව)', symbolEn: 'The womb (gateway of new life)',
    deitySi: 'යම දෙවියෝ (ධර්මයේ ආරක්ෂකයා)', deityEn: 'Yama (guardian of dharma)',
    natureSi: 'භරණි නැකතේ බිලිඳා දැඩි අධිෂ්ඨානයක් සහ ගැඹුරු හැඟීම් ඇති දරුවෙකි. කුඩා වයසේදීම තමන්ගේම මතයක් ඇති බව පෙනේ.',
    natureEn: 'A Bharani baby carries strong determination and deep feelings. Even young, they clearly have a mind of their own.',
    giftSi: 'නොසැලෙන ඉවසීම සහ වගකීම දැරීමේ හැකියාව — වැඩ අවසන් කරන දරුවෙකි.',
    giftEn: 'Unshakeable patience and a sense of responsibility — a child who finishes what they start.',
    parentSi: 'තද නීති වලට වඩා කරුණාවෙන් යුත් සීමා වැඩ කරයි; දරුවාගේ හැඟීම් වලට සවන් දෙන්න.',
    parentEn: 'Kind boundaries work better than strict rules — listen to this child\'s feelings.',
  },
  'Krittika': {
    symbolSi: 'ගිනි දැල්ල / තියුණු අසිපත', symbolEn: 'A flame / sharp blade',
    deitySi: 'අග්නි දෙවියෝ (ගින්නේ අධිපති)', deityEn: 'Agni (lord of fire)',
    natureSi: 'කෘතිකා නැකතේ බිලිඳා තියුණු බුද්ධියක් සහ පැහැදිලි අරමුණු ඇති දරුවෙකි. වැරදි දුටු විට නිහඬව නොසිටින සාධාරණ හදවතක් ඇත.',
    natureEn: 'A Krittika baby has a sharp mind and clear purpose. They carry a fair heart that will not stay silent at wrongs.',
    giftSi: 'නායකත්වය සහ සත්‍යය වෙනුවෙන් පෙනී සිටීමේ ධෛර්යය.',
    giftEn: 'Leadership and the courage to stand for the truth.',
    parentSi: 'දරුවාගේ තියුණු ප්‍රශ්නවලට ඉවසීමෙන් පිළිතුරු දෙන්න — ඒ බුද්ධිය වර්ධනය වන ලකුණකි.',
    parentEn: 'Answer their sharp questions patiently — it is a sign of a growing intellect.',
  },
  'Rohini': {
    symbolSi: 'ගොන් කරත්තය / රථය', symbolEn: 'An ox-cart / chariot',
    deitySi: 'බ්‍රහ්ම (මැවීමේ දෙවියෝ)', deityEn: 'Brahma (the creator)',
    natureSi: 'රෙහෙණ නැකත ඉතා සුබ නැකතකි. මෙම බිලිඳා ආකර්ෂණීය, කලාවට ලැදි සහ ආදරය බෙදන දරුවෙකි. පවුලට සතුට ගෙන එන උපතක් ලෙස සැලකේ.',
    natureEn: 'Rohini is among the most auspicious stars. This baby is charming, artistic and affectionate — a birth traditionally said to bring joy to the family.',
    giftSi: 'කලාත්මක හැකියාව, සුන්දරත්වයට ඇති ඇල්ම සහ මිනිසුන් ළං කරගන්නා සුහද බව.',
    giftEn: 'Artistic talent, a love of beauty, and a warmth that draws people close.',
    parentSi: 'සංගීතය, චිත්‍ර, කතන්දර — නිර්මාණශීලී දේට කුඩා කාලයේම අවස්ථාව දෙන්න.',
    parentEn: 'Music, drawing, stories — give creative outlets from an early age.',
  },
  'Mrigashira': {
    symbolSi: 'මුව හිස', symbolEn: "Deer's head",
    deitySi: 'සෝම (චන්ද්‍ර දෙවියෝ)', deityEn: 'Soma (the Moon god)',
    natureSi: 'මිගසිර නැකතේ බිලිඳා කුතුහලයෙන් පිරි, මෘදු සහ සොයා බලන සිතක් ඇති දරුවෙකි. අලුත් දේ සෙවීම ඔහුගේ/ඇයගේ ස්වභාවයයි.',
    natureEn: 'A Mrigashira baby is gentle and endlessly curious — a born explorer whose nature is to seek out the new.',
    giftSi: 'සියුම් නිරීක්ෂණ ශක්තිය සහ මිහිරි කථන හැකියාවක් — ඉගෙනීමට ඉතා දක්ෂයි.',
    giftEn: 'Fine observation and a sweet way with words — an excellent learner.',
    parentSi: 'ප්‍රශ්නවලට "පසුව" නොකියා පිළිතුරු සොයන්න එක්ක යන්න; කුතුහලය මේ දරුවාගේ වාසනාවයි.',
    parentEn: 'Explore their questions together instead of saying "later" — curiosity is this child\'s fortune.',
  },
  'Ardra': {
    symbolSi: 'කඳුළු බිඳුව / මැණික', symbolEn: 'A teardrop / gem',
    deitySi: 'රුද්‍ර (කුණාටුවේ අධිපති)', deityEn: 'Rudra (lord of storms)',
    natureSi: 'අද නැකතේ බිලිඳා ගැඹුරු හැඟීම් සහ බලවත් බුද්ධියක් ඇති දරුවෙකි. හැඟීම් තද වුවත්, ඒ තුළින්ම විශාල පරිවර්තන ශක්තියක් ලැබේ.',
    natureEn: 'An Ardra baby holds deep emotions and a powerful intellect. The intensity carries a great capacity for transformation.',
    giftSi: 'ගැටලු විසඳීමේ තියුණු හැකියාව සහ පර්යේෂණශීලී මනසක්.',
    giftEn: 'Sharp problem-solving and a research-minded intelligence.',
    parentSi: 'හැඟීම් වචනවලින් කියන්න උගන්වන්න — "දුකද? තරහද?" කියා අසමින් හැඟීම් හඳුනාගැනීමට උදව් කරන්න.',
    parentEn: 'Teach them to name feelings early — helping them recognise emotions turns intensity into strength.',
  },
  'Punarvasu': {
    symbolSi: 'ඊතල කොපුව / නිවහන', symbolEn: 'A quiver of arrows / return home',
    deitySi: 'අදිති දේවිය (අසීමිත අහසේ මව)', deityEn: 'Aditi (mother of the boundless sky)',
    natureSi: 'පුනාවස නැකතේ බිලිඳා සන්සුන්, කරුණාවන්ත සහ සමාව දීමට දන්නා දරුවෙකි. වැටුණත් නැවත නැගිටින ස්වභාවය මේ නැකතේ විශේෂ ආශීර්වාදයයි.',
    natureEn: 'A Punarvasu baby is calm, kind and forgiving. The special blessing of this star is resilience — they always rise again.',
    giftSi: 'ඕනෑම තැනකට හැඩගැසෙන හැකියාව සහ අවංක, පිරිසිදු හදවතක්.',
    giftEn: 'Adaptability and an honest, pure heart.',
    parentSi: 'ආරක්ෂිත, සාමකාමී නිවසක් මේ දරුවාට ලොකුම තෑග්ගයි; ගෙදර සතුට ඔවුන්ගේ ශක්තියයි.',
    parentEn: 'A safe, peaceful home is this child\'s greatest gift — family happiness is their strength.',
  },
  'Pushya': {
    symbolSi: 'එළදෙනගේ තනය / නෙළුම', symbolEn: "Cow's udder / lotus",
    deitySi: 'බෘහස්පති (දෙවියන්ගේ ගුරුවරයා)', deityEn: 'Brihaspati (teacher of the gods)',
    natureSi: 'පුෂ නැකත පෝෂණයේ නැකතයි — මේ බිලිඳා අන් අය රැකබලා ගන්නා, උණුසුම් සහ විශ්වාසවන්ත දරුවෙකි. ගුරු ග්‍රහයාගේ ආශීර්වාදය ලැබූ ඉතා සුබ උපතකි.',
    natureEn: 'Pushya is the star of nourishment — this baby is warm, trustworthy and caring. A highly auspicious birth blessed by Jupiter.',
    giftSi: 'ඉගැන්වීමේ හා රැකබලා ගැනීමේ හැකියාව; අන් අයට සෙවණ දෙන ගසක් වැනි දරුවෙකි.',
    giftEn: 'A gift for teaching and caring — a child who grows into a sheltering tree for others.',
    parentSi: 'කුඩා වගකීම් දෙන්න (මල් පැළයකට වතුර දැමීම වැනි) — රැකබලා ගැනීමේ සතුට ඔවුන්ට ඉඩ දෙන්න.',
    parentEn: 'Give small caring duties (like watering a plant) — let them enjoy nurturing early.',
  },
  'Ashlesha': {
    symbolSi: 'දඟර වූ නාගයා', symbolEn: 'Coiled serpent',
    deitySi: 'නාග දෙවියෝ (ප්‍රඥාවේ සර්පයෝ)', deityEn: 'The Nagas (serpents of wisdom)',
    natureSi: 'අස්ලිස නැකතේ බිලිඳා තියුණු ඉවක් සහ ගැඹුරු අවබෝධයක් ඇති දරුවෙකි. මිනිසුන්ගේ සිත් කියවීමේ පුදුම හැකියාවක් කුඩා කාලයේම පෙනේ.',
    natureEn: 'An Ashlesha baby has sharp intuition and deep perception — an uncanny ability to read people shows early.',
    giftSi: 'සියුම් බුද්ධිය, රහස් තබාගැනීමේ හැකියාව සහ ගැඹුරු කැපවීම.',
    giftEn: 'Subtle intelligence, discretion, and deep devotion.',
    parentSi: 'මේ දරුවා සමඟ අවංක වන්න — ඔවුන් බොරු ඉක්මනින් හඳුනා ගනී. විශ්වාසය ගොඩනැගීම වැදගත්ම දෙයයි.',
    parentEn: 'Be honest with this child — they sense untruths quickly. Building trust matters most.',
  },
  'Magha': {
    symbolSi: 'රජ සිංහාසනය', symbolEn: 'Royal throne',
    deitySi: 'පිතෘවරු (මුතුන් මිත්තන්ගේ ආත්ම)', deityEn: 'The Pitris (ancestral spirits)',
    natureSi: 'මා නැකතේ බිලිඳා උපතින්ම රාජකීය ගතිගුණ පෙන්වන දරුවෙකි — ආත්ම ගෞරවය, ත්‍යාගශීලී බව සහ පවුලට ඇති ගෞරවය ඔවුන්ගේ ලකුණයි.',
    natureEn: 'A Magha baby shows royal qualities from birth — dignity, generosity and respect for family heritage.',
    giftSi: 'නායකත්වය සහ පරම්පරාවේ නාමය බබළවන හැකියාව.',
    giftEn: 'Leadership and the ability to bring honour to the family name.',
    parentSi: 'ගෞරවයෙන් සලකන විට මේ දරුවා දිලිසෙයි; අපහාසය ඔවුන්ට ගැඹුරින් දැනේ.',
    parentEn: 'This child shines when treated with respect; belittling cuts them deeply.',
  },
  'Purva Phalguni': {
    symbolSi: 'ඇඳේ ඉදිරිපස කකුල්', symbolEn: 'Front legs of a bed (rest & pleasure)',
    deitySi: 'භග දෙවියෝ (සතුටේ හා වාසනාවේ අධිපති)', deityEn: 'Bhaga (lord of delight and fortune)',
    natureSi: 'පුවපල් නැකතේ බිලිඳා ප්‍රීතිමත්, ආදරණීය සහ නිර්මාණශීලී දරුවෙකි. සතුට බෙදාගැනීම සහ මිතුරන් ඇති කරගැනීම ඔවුන්ට ඉතා පහසුයි.',
    natureEn: 'A Purva Phalguni baby is joyful, loving and creative — sharing happiness and making friends comes naturally.',
    giftSi: 'කලාව, විනෝදය සහ මිනිසුන් සතුටු කිරීමේ හැකියාව.',
    giftEn: 'Art, playfulness and the gift of making people happy.',
    parentSi: 'විනෝදයත් වැඩත් සමබර කරන පුරුදු කුඩා කාලයේම හුරු කරන්න.',
    parentEn: 'Gently teach the balance between play and duty from early on.',
  },
  'Uttara Phalguni': {
    symbolSi: 'ඇඳේ පසුපස කකුල්', symbolEn: 'Back legs of a bed (support)',
    deitySi: 'අර්යමන් (ගිවිසුම්වල හා මිත්‍රත්වයේ දෙවියෝ)', deityEn: 'Aryaman (god of friendship and pacts)',
    natureSi: 'උත්‍රපල් නැකතේ බිලිඳා විශ්වාසවන්ත, උදව් කරන සහ වචනය රකින දරුවෙකි. අන් අය ඔවුන් මත විශ්වාසය තබයි.',
    natureEn: 'An Uttara Phalguni baby is dependable, helpful and true to their word — others naturally rely on them.',
    giftSi: 'ස්ථාවර මිත්‍රත්වය සහ සංවිධාන හැකියාව.',
    giftEn: 'Steadfast friendship and a talent for organising.',
    parentSi: 'පොරොන්දු රකින ආදර්ශය ඔබෙන්ම දරුවාට පෙන්වන්න — ඒ ගුණය ඔවුන්ගේ ජීවිත ශක්තියයි.',
    parentEn: 'Model kept promises yourself — integrity is this child\'s life-strength.',
  },
  'Hasta': {
    symbolSi: 'අත්ල', symbolEn: 'The open hand',
    deitySi: 'සවිතෘ (උදාවන හිරු දෙවියෝ)', deityEn: 'Savitar (the rising sun)',
    natureSi: 'හත නැකතේ බිලිඳා දක්ෂ අත් ඇති, බුද්ධිමත් සහ හාස්‍යයට ලැදි දරුවෙකි. අතින් කරන ඕනෑම දෙයක — චිත්‍ර, වැඩ, ක්‍රීඩා — දස්කම් පෙන්වයි.',
    natureEn: 'A Hasta baby has skilled hands, wit and cleverness — talent shows in anything hands-on: art, craft, sport.',
    giftSi: 'ශිල්පීය දක්ෂතාව සහ ඕනෑම දෙයක් ඉගෙන ගන්නා ඉක්මන් බව.',
    giftEn: 'Craftsmanship and a quick grasp of any new skill.',
    parentSi: 'අතින් කරන දේවල් — ගොඩනැගිලි කට්ටල, මැටි වැඩ, චිත්‍ර — මේ දරුවාගේ බුද්ධිය වඩවන හොඳම මාර්ගයයි.',
    parentEn: 'Hands-on activities — blocks, clay, drawing — are the best way to grow this child\'s mind.',
  },
  'Chitra': {
    symbolSi: 'දිලිසෙන මුතු ඇටය', symbolEn: 'A brilliant jewel',
    deitySi: 'විශ්වකර්ම (දිව්‍ය ගෘහ නිර්මාණ ශිල්පියා)', deityEn: 'Vishwakarma (the divine architect)',
    natureSi: 'සිත නැකතේ බිලිඳා දීප්තිමත්, ආකර්ෂණීය සහ නිර්මාණශීලී දරුවෙකි. සුන්දර දේ නිර්මාණය කිරීමේ සහජ හැකියාවක් ඇත.',
    natureEn: 'A Chitra baby is bright, magnetic and creative, with an inborn gift for making beautiful things.',
    giftSi: 'නිර්මාණශීලීත්වය, විලාසිතා ඥානය සහ දේවල් අලංකාර කිරීමේ හැකියාව.',
    giftEn: 'Creativity, design sense and an eye for beauty.',
    parentSi: 'දරුවාගේ නිර්මාණ අගය කරන්න — කුඩා ප්‍රශංසාවක් ඔවුන්ගේ ලෝකය බබළවයි.',
    parentEn: 'Praise their creations — small appreciation lights up their whole world.',
  },
  'Swati': {
    symbolSi: 'සුළඟේ සැලෙන පැළය', symbolEn: 'A young shoot swaying in the wind',
    deitySi: 'වායු දෙවියෝ (සුළඟේ අධිපති)', deityEn: 'Vayu (lord of the wind)',
    natureSi: 'සා නැකතේ බිලිඳා නිදහසට ලැදි, සුමට සහ සමබර සිතක් ඇති දරුවෙකි. තමන්ගේම මාර්ගයෙන් ඉදිරියට යාමේ ශක්තිය ඔවුන් සතුයි.',
    natureEn: 'A Swati baby loves independence and carries a gentle, balanced mind — with the strength to grow their own way.',
    giftSi: 'ස්වාධීනත්වය, රාජ්‍ය තාන්ත්‍රික සුහදබව සහ ව්‍යාපාරික ඉවක්.',
    giftEn: 'Independence, diplomacy and a nose for opportunity.',
    parentSi: 'තෝරාගැනීම් දෙන්න ("නිල් ද කහ ද?") — තමන්ම තීරණ ගැනීමේ අවකාශය මේ දරුවාට ඔක්සිජන් වගේ.',
    parentEn: 'Offer choices ("blue or yellow?") — room to decide is like oxygen to this child.',
  },
  'Vishakha': {
    symbolSi: 'ජයග්‍රහණ තොරණ', symbolEn: 'Triumphal archway',
    deitySi: 'ඉන්ද්‍ර-අග්නි (ජයග්‍රහණයේ බලය)', deityEn: 'Indra-Agni (power of victory)',
    natureSi: 'විසා නැකතේ බිලිඳා අරමුණකට වෙලා වැඩ කරන, ජය ලබන ස්වභාවයක් ඇති දරුවෙකි. එක දෙයකට කේන්ද්‍ර වූ විට නවත්වන්න බැරි උනන්දුවක් පෙන්වයි.',
    natureEn: 'A Vishakha baby is goal-driven with a victorious spirit — once focused, their determination is unstoppable.',
    giftSi: 'ඉලක්ක සපුරාගැනීමේ අධිෂ්ඨානය සහ කණ්ඩායමක් දිනවීමේ හැකියාව.',
    giftEn: 'Determination to achieve and the power to rally a team.',
    parentSi: 'කුඩා ඉලක්ක තියලා ඒවා සමරන්න — ජයග්‍රහණයේ සතුට මේ දරුවාගේ ඉන්ධනයයි.',
    parentEn: 'Set small goals and celebrate them — the joy of winning is this child\'s fuel.',
  },
  'Anuradha': {
    symbolSi: 'පිපුණු නෙළුම', symbolEn: 'A blossoming lotus',
    deitySi: 'මිත්‍ර දෙවියෝ (මිත්‍රත්වයේ අධිපති)', deityEn: 'Mitra (lord of friendship)',
    natureSi: 'අනුර නැකතේ බිලිඳා මිත්‍රශීලී, භක්තිමත් සහ දුෂ්කර තැනකදීත් මල් පිපෙන්නා සේ දියුණු වන දරුවෙකි. සහයෝගයෙන් වැඩ කිරීම ඔවුන්ගේ බලයයි.',
    natureEn: 'An Anuradha baby is friendly and devoted, blooming even in hard soil. Working with others is their power.',
    giftSi: 'මිත්‍රත්වය රැකීම, කණ්ඩායම් හැඟීම සහ නොපසුබට උත්සාහය.',
    giftEn: 'Loyal friendship, team spirit and quiet perseverance.',
    parentSi: 'මිතුරන් සමඟ සෙල්ලම් කිරීමට නිතර ඉඩ දෙන්න — සබඳතා තුළින් මේ දරුවා ඉගෙන ගනී.',
    parentEn: 'Make room for play with friends — this child learns through connection.',
  },
  'Jyeshtha': {
    symbolSi: 'රවුම් තලිසමය (ආරක්ෂක පළඳනාව)', symbolEn: 'A circular amulet',
    deitySi: 'ඉන්ද්‍ර දෙවියෝ (දෙවියන්ගේ රජු)', deityEn: 'Indra (king of the gods)',
    natureSi: 'දෙට නැකතේ බිලිඳා වැඩිහිටි බුද්ධියක් ඇති, ආරක්ෂක ස්වභාවයේ දරුවෙකි. සහෝදර සහෝදරියන් හා මිතුරන් රැකබලා ගන්නා "ලොකු අයියා/අක්කා" ගතිය කුඩාවටම පෙනේ.',
    natureEn: 'A Jyeshtha baby carries an old soul and a protective streak — the "big sibling" nature shows early.',
    giftSi: 'වගකීම දැරීමේ ධෛර්යය සහ අන් අය ආරක්ෂා කිරීමේ හදවත.',
    giftEn: 'Courage under responsibility and a protector\'s heart.',
    parentSi: 'වගකීම දෙන අතරම දරුවෙක් වීමට ද ඉඩ දෙන්න — හැම විටම "ලොකු කෙනා" වෙන්න ඕනේ නැහැ.',
    parentEn: 'Balance responsibility with room to just be a child — they need not always be "the big one".',
  },
  'Mula': {
    symbolSi: 'බැඳි මුල් මිටිය', symbolEn: 'A bundle of roots',
    deitySi: 'නිරෘති දේවිය (මුල් දක්වා යාමේ බලය)', deityEn: 'Nirriti (power that reaches the root)',
    natureSi: 'මුල නැකතේ බිලිඳා දේවල මුලටම යන ගවේෂණශීලී මනසක් ඇති දරුවෙකි. "ඇයි?" කියන ප්‍රශ්නය ඔවුන්ගේ ප්‍රියතම වචනය වනු ඇත — ගැඹුරු දාර්ශනික බුද්ධියක ලකුණයි.',
    natureEn: 'A Mula baby digs to the root of things — "why?" becomes their favourite word, the sign of a deep philosophical mind.',
    giftSi: 'සත්‍යය සෙවීමේ ධෛර්යය සහ ගැඹුරු පර්යේෂණ බුද්ධිය.',
    giftEn: 'Courage to seek truth and a deeply investigative intellect.',
    parentSi: 'මුල නැකතට සාම්ප්‍රදායිකව විශේෂ පූජා විධි නිර්දේශ වේ — වැඩි විස්තර දෝෂ කොටසේ බලන්න. දරුවාගේ ගැඹුරු ප්‍රශ්නවලට ගරු කරන්න.',
    parentEn: 'Tradition prescribes special rites for Mula — see the dosha section. Honour this child\'s deep questions.',
  },
  'Purva Ashadha': {
    symbolSi: 'ඇත් දළය / පවන් පත', symbolEn: 'Elephant tusk / winnowing fan',
    deitySi: 'අපස් (ජලයේ දේවතාවෝ)', deityEn: 'Apas (goddess of waters)',
    natureSi: 'පුවසල නැකතේ බිලිඳා නොසැලෙන ආත්ම විශ්වාසයක් ඇති, දිනන ආකල්පයේ දරුවෙකි. ජලය සේ — මෘදු නමුත් නොනවතින ශක්තියක්.',
    natureEn: 'A Purva Ashadha baby has unshakeable self-belief and a winning outlook — like water, gentle yet unstoppable.',
    giftSi: 'අභියෝගවලදී නොසැලෙන බව සහ අන් අය ධෛර්යමත් කිරීමේ හැකියාව.',
    giftEn: 'Composure under challenge and the power to inspire others.',
    parentSi: 'ආත්ම විශ්වාසය ආඩම්බරයට නොහැරෙන ලෙස නිහතමානීකමද උගන්වන්න.',
    parentEn: 'Alongside confidence, gently teach humility.',
  },
  'Uttara Ashadha': {
    symbolSi: 'ඇත් දළය / මංචකය', symbolEn: 'Elephant tusk / plank of victory',
    deitySi: 'විශ්වේ දේවා (සියලු දෙවිවරු)', deityEn: 'The Vishvedevas (all the gods)',
    natureSi: 'උත්‍රසල නැකතේ බිලිඳා අවංක, ධර්මිෂ්ඨ සහ කල් පවතින ජයග්‍රහණ ලබන දරුවෙකි. ඉක්මන් ජය නොව ස්ථිර ජය ඔවුන්ගේ මාර්ගයයි.',
    natureEn: 'An Uttara Ashadha baby is honest and righteous, destined for lasting (not quick) victories.',
    giftSi: 'චරිත ශුද්ධිය සහ දිගු ගමනක නොවරදින අධිෂ්ඨානය.',
    giftEn: 'Integrity and marathon-grade determination.',
    parentSi: 'ඉවසීමේ වටිනාකම කතන්දර හරහා කියාදෙන්න — මේ දරුවාගේ ජය කාලයත් සමඟ එයි.',
    parentEn: 'Teach patience through stories — this child\'s victories ripen with time.',
  },
  'Shravana': {
    symbolSi: 'කන / පියවර තුනක්', symbolEn: 'An ear / three footsteps',
    deitySi: 'විෂ්ණු දෙවියෝ (රැකවරණයේ අධිපති)', deityEn: 'Vishnu (the preserver)',
    natureSi: 'සුවණ නැකත ඉගෙනීමේ නැකතයි — මේ බිලිඳා අසා ඉගෙන ගන්නා, ඥානවන්ත සහ සන්සුන් දරුවෙකි. කතන්දර හා සංගීතය ඔවුන්ට විශේෂ ආහාරයකි.',
    natureEn: 'Shravana is the star of learning — this baby learns by listening, wise and calm. Stories and music are special nourishment.',
    giftSi: 'ඇසීමෙන් ඉගෙනීමේ අසාමාන්‍ය හැකියාව සහ දැනුම බෙදාදීමේ ගුණය.',
    giftEn: 'A rare gift for learning by ear and sharing knowledge.',
    parentSi: 'හැමදාම කතන්දරයක් කියන්න හෝ කියවන්න — මේ දරුවාගේ බුද්ධියට හොඳම පෝෂණයයි.',
    parentEn: 'Read or tell a story daily — the best food for this child\'s mind.',
  },
  'Dhanishtha': {
    symbolSi: 'බෙරය', symbolEn: 'A drum',
    deitySi: 'අෂ්ට වසූහු (සමෘද්ධියේ දෙවිවරු)', deityEn: 'The eight Vasus (gods of abundance)',
    natureSi: 'දෙනට නැකතේ බිලිඳා රිද්මයට ලැදි, උද්‍යෝගිමත් සහ ත්‍යාගශීලී දරුවෙකි. සංගීතයට හා චලනයට ඇති හැඟීම උපතින්ම පැමිණේ.',
    natureEn: 'A Dhanishtha baby is rhythmic, spirited and generous — feeling for music and movement is inborn.',
    giftSi: 'සංගීත රිද්මය, කණ්ඩායම් ජවය සහ සමෘද්ධිය ඇද ගන්නා වාසනාව.',
    giftEn: 'Musical rhythm, team energy and a fortune that attracts abundance.',
    parentSi: 'බෙර පදයකට නටන්න ඉඩ දෙන්න! සංගීතය මේ දරුවාගේ භාෂාවයි.',
    parentEn: 'Let them dance to a drumbeat! Music is this child\'s first language.',
  },
  'Shatabhisha': {
    symbolSi: 'රවුමක තරු සියයක්', symbolEn: 'A hundred stars in a circle',
    deitySi: 'වරුණ දෙවියෝ (සාගරයේ අධිපති)', deityEn: 'Varuna (lord of cosmic waters)',
    natureSi: 'සියාවස නැකතේ බිලිඳා ගුප්ත දේ විසඳන, ස්වාධීන සහ සුව කිරීමේ හැකියාව ඇති දරුවෙකි. "තරු සියයක බලය" — එනම් සුවපත් කිරීමේ නැකත ලෙස සැලකේ.',
    natureEn: 'A Shatabhisha baby is an independent mystery-solver with a healing touch — known as the star of a hundred healers.',
    giftSi: 'විද්‍යාත්මක මනස, රහස් විසඳීම සහ සුව කිරීමේ ස්පර්ශය.',
    giftEn: 'A scientific mind, riddle-solving and a healer\'s touch.',
    parentSi: 'තනිව සෙල්ලම් කරන වෙලාවලට ගරු කරන්න — හුදකලාව නොව, මේ දරුවාගේ නිර්මාණ අවකාශයයි.',
    parentEn: 'Respect their solo-play time — not loneliness, but this child\'s creative space.',
  },
  'Purva Bhadrapada': {
    symbolSi: 'අවමංගල මංචකයේ ඉදිරි කකුල්', symbolEn: 'Front legs of a ceremonial stand',
    deitySi: 'අජ ඒකපාද (එක් පාදයේ අග්නි ස්වරූපය)', deityEn: 'Aja Ekapada (one-footed fire)',
    natureSi: 'පුවපුටුප නැකතේ බිලිඳා ගැඹුරු චින්තනයක් සහ පරමාදර්ශී හදවතක් ඇති දරුවෙකි. ලෝකය වෙනස් කිරීමේ සිහින දකින විශේෂ ආත්මයකි.',
    natureEn: 'A Purva Bhadrapada baby carries deep thought and an idealist\'s heart — a soul that dreams of changing the world.',
    giftSi: 'දාර්ශනික බුද්ධිය සහ පොදු යහපත වෙනුවෙන් කැපවීම.',
    giftEn: 'Philosophical depth and devotion to the greater good.',
    parentSi: 'දරුවාගේ ලොකු සිහිනවලට සිනාසෙන්න එපා — ඒවා හරි දිශාවට යොමු කරන්න.',
    parentEn: 'Never laugh at their big dreams — help point them in a good direction.',
  },
  'Uttara Bhadrapada': {
    symbolSi: 'ගැඹුරු ජලයේ නාගයා', symbolEn: 'Serpent of the deep waters',
    deitySi: 'අහිර්බුධ්න්‍ය (ගැඹුරේ නාග දෙවියෝ)', deityEn: 'Ahirbudhnya (serpent of the depths)',
    natureSi: 'උත්‍රපුටුප නැකතේ බිලිඳා සන්සුන් ගැඹුරක් ඇති, ඉවසිලිවන්ත සහ කරුණාවන්ත දරුවෙකි. ඔවුන්ගේ නිශ්ශබ්දතාව තුළ ලොකු ප්‍රඥාවක් සැඟවී ඇත.',
    natureEn: 'An Uttara Bhadrapada baby has calm depth, patience and kindness — great wisdom rests in their quiet.',
    giftSi: 'ගැඹුරු ඉවසීම, කරුණාව සහ අර්බුදයකදී සන්සුන්ව සිටීමේ බලය.',
    giftEn: 'Deep patience, compassion and calm in a storm.',
    parentSi: 'නිහඬ දරුවා දුර්වල නොවේ — ඔවුන්ගේ අදහස් ඇසීමට කාලය දෙන්න.',
    parentEn: 'A quiet child is not a weak one — give them time and space to be heard.',
  },
  'Revati': {
    symbolSi: 'මසුන් යුවළ / බෙරය', symbolEn: 'A pair of fish',
    deitySi: 'පූෂන් (ආරක්ෂිත ගමනේ දෙවියෝ)', deityEn: 'Pushan (protector of journeys)',
    natureSi: 'රේවතී නැකත 27 නැකත්වල අවසාන, පරිපූර්ණ නැකතයි. මේ බිලිඳා මෘදු, දයාබර සහ සියල්ලන්ටම ආදරය කරන දරුවෙකි — කුඩා සතුන්ටත් කරුණාව දක්වන හදවතක්.',
    natureEn: 'Revati, the final star, is one of completion. This baby is gentle and compassionate — kind even to the smallest creatures.',
    giftSi: 'අසීමිත කරුණාව, පරිකල්පනය සහ ආරක්ෂා කිරීමේ ගුණය.',
    giftEn: 'Boundless kindness, imagination and a protective grace.',
    parentSi: 'මේ මෘදු හදවත ශක්තියක් ලෙස වඩන්න — කරුණාව දුර්වලකමක් නොවන බව පෙන්වා දෙන්න.',
    parentEn: 'Raise this soft heart as a strength — show them kindness is never weakness.',
  },
};

// ── Gana / Yoni Sinhala labels + baby-friendly glosses ──────────────────────
const GANA_INFO = {
  Deva: { si: 'දේව ගණය', en: 'Deva (divine) gana', glossSi: 'සන්සුන්, කරුණාවන්ත ස්වභාවයක්', glossEn: 'a calm, kind temperament' },
  Manushya: { si: 'මනුෂ්‍ය ගණය', en: 'Manushya (human) gana', glossSi: 'ප්‍රායෝගික, සමබර ස්වභාවයක්', glossEn: 'a practical, balanced temperament' },
  Rakshasa: { si: 'රාක්ෂ ගණය', en: 'Rakshasa (bold) gana', glossSi: 'නිර්භීත, ශක්තිමත් ස්වභාවයක්', glossEn: 'a bold, strong-willed temperament' },
};

const YONI_SI = {
  Horse: 'අශ්වයා', Elephant: 'ඇතා', Goat: 'එළුවා', Serpent: 'නාගයා', Dog: 'බල්ලා',
  Cat: 'බළලා', Rat: 'මීයා', Cow: 'එළදෙන', Buffalo: 'මී හරකා', Tiger: 'කොටියා',
  Deer: 'මුවා', Monkey: 'වඳුරා', Mongoose: 'මුගටියා', Lion: 'සිංහයා',
};

// ── Planet Sinhala names (grahas) ────────────────────────────────────────────
const PLANET_SI = {
  Sun: 'රවි', Moon: 'චන්ද්‍ර', Mars: 'කුජ', Mercury: 'බුධ', Jupiter: 'ගුරු',
  Venus: 'සිකුරු', Saturn: 'ශනි', Rahu: 'රාහු', Ketu: 'කේතු',
};

// ── Vimshottari lords — childhood framing (si + en) ─────────────────────────
const DASHA_CHILD_NOTES = {
  Sun: {
    si: 'රවි දශාව — ආත්ම විශ්වාසය හා අනන්‍යතාව හැඩගැසෙන කාලයයි. දරුවාට කුඩා ජයග්‍රහණ අත්විඳින්න ඉඩ දෙන්න.',
    en: 'Sun period — confidence and identity take shape. Let the child taste small victories.',
  },
  Moon: {
    si: 'චන්ද්‍ර දශාව — හැඟීම් හා බැඳීම් වර්ධනය වන මෘදු කාලයයි. උණුසුම හා ආරක්ෂිත බව ප්‍රධානයි.',
    en: 'Moon period — a tender phase of feelings and bonding. Warmth and security matter most.',
  },
  Mars: {
    si: 'කුජ දශාව — ශක්තිය හා ධෛර්යය පිබිදෙන කාලයයි. ක්‍රීඩාවට හා ශාරීරික ක්‍රියාකාරකම්වලට ඉඩ දෙන්න.',
    en: 'Mars period — energy and courage awaken. Sport and physical play are healthy outlets.',
  },
  Mercury: {
    si: 'බුධ දශාව — කථනය, ඉගෙනීම හා කුතුහලය දියුණු වන කාලයයි. පොත්, කතන්දර හා ප්‍රශ්නවලට හොඳම කාලයයි.',
    en: 'Mercury period — speech, learning and curiosity blossom. The best time for books, stories and questions.',
  },
  Jupiter: {
    si: 'ගුරු දශාව — ප්‍රඥාව හා ගුණධර්ම වැඩෙන ආශීර්වාද සම්පන්න කාලයයි. හොඳ ගුරුවරුන් හා ආදර්ශ ලැබෙයි.',
    en: 'Jupiter period — a blessed phase of wisdom and values. Good teachers and role models appear.',
  },
  Venus: {
    si: 'සිකුරු දශාව — කලාව, සුන්දරත්වය හා සබඳතා මල් පිපෙන කාලයයි. සංගීතය හා නිර්මාණශීලී දේ දිරිමත් කරන්න.',
    en: 'Venus period — art, beauty and connection flower. Encourage music and creativity.',
  },
  Saturn: {
    si: 'ශනි දශාව — ඉවසීම හා විනය පුහුණු වන කාලයයි. සෙමින් වුවත් ස්ථිර ප්‍රගතියක් ලැබේ; දරුවාට කාලය දෙන්න.',
    en: 'Saturn period — patience and discipline are trained. Progress is slow but lasting; give the child time.',
  },
  Rahu: {
    si: 'රාහු දශාව — අලුත් දේට ඇති ආශාව වැඩෙන කාලයයි. නව අත්දැකීම් හොඳයි; හොඳ පුරුදු මුල් තැනට ගන්න.',
    en: 'Rahu period — hunger for the new grows. Fresh experiences help; keep good routines at the centre.',
  },
  Ketu: {
    si: 'කේතු දශාව — අධ්‍යාත්මික, සියුම් බුද්ධිය වැඩෙන කාලයයි. සන්සුන් පරිසරය හා සරල දිනචරියාව සුවදායකයි.',
    en: 'Ketu period — subtle, inward intelligence grows. Calm surroundings and simple routine are soothing.',
  },
};

// ── Elements ─────────────────────────────────────────────────────────────────
const ELEMENT_OF_RASHI = { 1: 'fire', 2: 'earth', 3: 'air', 4: 'water', 5: 'fire', 6: 'earth', 7: 'air', 8: 'water', 9: 'fire', 10: 'earth', 11: 'air', 12: 'water' };

const ELEMENT_INFO = {
  fire: {
    si: 'ගිනි', en: 'Fire',
    babySi: 'ගිනි ධාතුව ප්‍රබලයි — ජවසම්පන්න, උද්‍යෝගී දරුවෙකි. ක්‍රියාශීලී සෙල්ලම් වලට ඉඩ දී, නින්දට පෙර සන්සුන් චර්යාවක් පුරුදු කරන්න.',
    babyEn: 'Fire is strong — an energetic, spirited child. Allow active play, and keep a calming wind-down before sleep.',
  },
  earth: {
    si: 'පෘථිවි', en: 'Earth',
    babySi: 'පෘථිවි ධාතුව ප්‍රබලයි — ස්ථාවර, සන්සුන් දරුවෙකි. දිනචරියාවේ විධිමත් බව ඔවුන්ට සුවයක්; හදිසි වෙනස්කම් සෙමින් හඳුන්වා දෙන්න.',
    babyEn: 'Earth is strong — a steady, settled child. Routine comforts them; introduce changes gently.',
  },
  air: {
    si: 'වායු', en: 'Air',
    babySi: 'වායු ධාතුව ප්‍රබලයි — කුතුහලයෙන් පිරි, කථනයට ලැදි දරුවෙකි. කතාබහ, ගීත හා අලුත් අත්දැකීම් ඔවුන්ගේ බුද්ධිය පෝෂණය කරයි.',
    babyEn: 'Air is strong — a curious, chatty child. Conversation, songs and new experiences feed their mind.',
  },
  water: {
    si: 'ජල', en: 'Water',
    babySi: 'ජල ධාතුව ප්‍රබලයි — සංවේදී, ආදරණීය දරුවෙකි. හැඟීම් ගැඹුරින් දැනෙන නිසා උණුසුම් වැළඳගැනීම් හා සන්සුන් ස්වරය වැදගත්.',
    babyEn: 'Water is strong — a sensitive, loving child. Feelings run deep, so warm hugs and a calm voice matter.',
  },
};

// ── Panchanga Sinhala labels ─────────────────────────────────────────────────
const WEEKDAY_SI = ['ඉරිදා', 'සඳුදා', 'අඟහරුවාදා', 'බදාදා', 'බ්‍රහස්පතින්දා', 'සිකුරාදා', 'සෙනසුරාදා'];
const WEEKDAY_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TITHI_SI = {
  1: 'පෑළවිය', 2: 'දියවක', 3: 'තියවක', 4: 'ජලවක', 5: 'විසේනිය', 6: 'සැටවක', 7: 'සතවක',
  8: 'අටවක', 9: 'නවවක', 10: 'දසවක', 11: 'එකොළොස්වක', 12: 'දොළොස්වක', 13: 'තෙළෙස්වක', 14: 'තුදුස්වක', 15: 'පසළොස්වක (පෝය)',
};

function tithiToSinhala(tithi) {
  const n = tithi && tithi.number ? tithi.number : null;
  if (!n) return tithi && tithi.name ? tithi.name : '';
  if (n === 30) return 'අව අමාවක';
  if (n === 15) return 'පුර පසළොස්වක (පෝය)';
  const inShukla = n <= 15;
  const dayNum = inShukla ? n : n - 15;
  const base = TITHI_SI[dayNum] || (tithi.name || '');
  return (inShukla ? 'පුර ' : 'අව ') + base;
}


// ═══════════════════════════════════════════════════════════════════════════
//  SECTION BUILDERS
// ═══════════════════════════════════════════════════════════════════════════

function buildBirthMoment(date, lat, lng) {
  const local = formatLocalDateTime(date);
  // Weekday of the LOCAL calendar date (not UTC).
  const localMidday = new Date(local.date + 'T12:00:00Z');
  const dow = localMidday.getUTCDay();

  let tithi = null, yoga = null;
  try {
    const p = getPanchanga(date, lat, lng);
    tithi = p.tithi ? { name: p.tithi.name, number: p.tithi.number, sinhala: tithiToSinhala(p.tithi) } : null;
    yoga = p.yoga ? { name: p.yoga.name } : null;
  } catch (e) { /* panchanga is decorative here — never fail the report */ }

  return {
    dateISO: date.toISOString(),
    localDate: local.date,
    localTime: local.time,
    weekday: { en: WEEKDAY_EN[dow], si: WEEKDAY_SI[dow] },
    tithi,
    yoga,
  };
}

function buildPlanetTable(date, lat, lng) {
  const positions = getAllPlanetPositions(date, lat, lng);
  const rows = [];
  for (const [key, p] of Object.entries(positions)) {
    if (!p || p.rashiId == null) continue;
    const rashi = RASHIS[p.rashiId - 1] || {};
    rows.push({
      key,
      name: p.name,
      sinhala: PLANET_SI[p.name] || p.sinhala || p.name,
      rashi: rashi.english || rashi.name || '',
      rashiSinhala: rashi.sinhala || '',
      degree: typeof p.degreeInSign === 'number' ? Math.round(p.degreeInSign * 10) / 10 : null,
      retrograde: !!p.isRetrograde,
    });
  }
  return rows;
}

function buildStarProfile(nakshatra) {
  const name = nakshatra.name;
  const profile = NAKSHATRA_BABY_PROFILES[name] || {};
  const gana = GANA_MAP[name] || null;
  const yoni = YONI_MAP[name] || null;
  const lordName = nakshatra.lord;
  return {
    name,
    sinhala: nakshatra.sinhala,
    pada: nakshatra.pada,
    lord: { name: lordName, sinhala: PLANET_SI[lordName] || lordName },
    gana: gana ? { key: gana, ...GANA_INFO[gana] } : null,
    yoni: yoni ? { en: yoni, si: YONI_SI[yoni] || yoni } : null,
    symbol: { si: profile.symbolSi || '', en: profile.symbolEn || '' },
    deity: { si: profile.deitySi || '', en: profile.deityEn || '' },
    nature: { si: profile.natureSi || '', en: profile.natureEn || '' },
    gift: { si: profile.giftSi || '', en: profile.giftEn || '' },
    parentNote: { si: profile.parentSi || '', en: profile.parentEn || '' },
  };
}

function buildNaming(nakshatra, gender) {
  const letters = NAMING_LETTERS[nakshatra.name] || [];
  const babyPada = Math.min(Math.max(nakshatra.pada || 1, 1), 4);
  // Gender is mandatory upstream; default the name list to the baby's gender.
  const defaultGender = gender === 'male' || gender === 'female' ? gender : 'male';

  const padas = letters.map((l, i) => {
    const pool = NAME_IDEAS[l.si] || { m: [], f: [] };
    return {
      pada: i + 1,
      letter: l.si,
      roman: l.ro,
      isBabyPada: i + 1 === babyPada,
      names: { male: pool.m, female: pool.f },
    };
  });

  const babyEntry = padas[babyPada - 1] || null;
  const nameCount = padas.reduce((acc, p) => acc + p.names.male.length + p.names.female.length, 0);

  return {
    nakshatra: nakshatra.name,
    nakshatraSinhala: nakshatra.sinhala,
    pada: babyPada,
    letter: babyEntry ? { si: babyEntry.letter, roman: babyEntry.roman } : null,
    padas,
    nameCount,
    defaultGender,
    howItWorks: {
      si: 'සම්ප්‍රදායට අනුව, බිලිඳා උපන් නැකතේ පාදයට (නැකතක එක් කාලයකට) හිමි අකුරින් නම ආරම්භ වීම සුබයි. නම එම ශබ්දයෙන් පටන් ගැනීම ප්‍රමාණවත් — සමීප ශබ්දයකින් පටන් ගන්නා නමක් ද සුදුසුයි.',
      en: "By tradition, a name beginning with the letter of the baby's birth nakshatra pada is auspicious. Starting with that sound is what matters — a close-sounding name is also fine.",
    },
    rareLetterNote: {
      si: 'අකුර දුර්ලභ නම්, එම නැකතේම අනෙක් පාද අකුරක් හෝ එම ශබ්දයට සමීප නමක් භාවිත කිරීම සම්ප්‍රදායිකව පිළිගැනේ.',
      en: 'If the letter is rare, tradition accepts another pada letter of the same nakshatra, or a name close to the sound.',
    },
  };
}

// Ganda Moola: Moon in a junction nakshatra. Computed HERE from our own
// nakshatra (not via the astrology-insights adapter) so the paid verdict can
// never silently regress to "no dosha" on an interop miss.
const GANDA_MOOLA_NAKSHATRAS = ['Ashwini', 'Ashlesha', 'Magha', 'Jyeshtha', 'Mula', 'Revati'];
const MOOLA_SEVERE_PADA_1 = ['Ashwini', 'Magha', 'Mula'];
const MOOLA_SEVERE_PADA_4 = ['Ashlesha', 'Jyeshtha', 'Revati'];

function buildDoshas(date, lat, lng, nakshatra) {
  let gandanta = null;
  if (enhanced) {
    try { gandanta = enhanced.analyzeGandanta(date, lat, lng); } catch (e) { console.warn('[babyReport] gandanta failed:', e.message); }
  }

  const hasMoola = GANDA_MOOLA_NAKSHATRAS.includes(nakshatra.name);
  const moolaSevere = hasMoola && (
    (MOOLA_SEVERE_PADA_1.includes(nakshatra.name) && nakshatra.pada === 1) ||
    (MOOLA_SEVERE_PADA_4.includes(nakshatra.name) && nakshatra.pada === 4)
  );
  const hasGandanta = !!(gandanta && gandanta.hasGandanta);

  const moola = {
    checked: true,
    present: hasMoola,
    severity: hasMoola ? (moolaSevere ? 'severe' : 'mild') : null,
    severityLabel: hasMoola
      ? (moolaSevere
        ? { si: 'ප්‍රබල මට්ටම — ' + nakshatra.pada + ' වන පාදය සන්ධි ලක්ෂ්‍යයට ආසන්නයි', en: 'Strong form — pada ' + nakshatra.pada + ' sits at the junction point' }
        : { si: 'මෘදු මට්ටම', en: 'Mild form' })
      : null,
    nakshatra: nakshatra.name,
    nakshatraSinhala: nakshatra.sinhala,
    pada: nakshatra.pada,
    meaning: {
      si: 'ගණ්ඩ මූල දෝෂය යනු චන්ද්‍රයා නැකත් මාරු වන සන්ධි නැකතක (අස්විද, අස්ලිස, මා, දෙට, මුල, රේවතී) උපත ලැබීමයි. පැරණි විශ්වාසයට අනුව මෙවැනි උපතකට විශේෂ ශාන්ති කර්ම නිර්දේශ වේ.',
      en: 'Ganda Moola means birth when the Moon sits in a junction nakshatra (Ashwini, Ashlesha, Magha, Jyeshtha, Mula, Revati). Tradition prescribes special calming rites for such a birth.',
    },
    verdict: hasMoola
      ? {
        si: 'බිලිඳා උපන්නේ සන්ධි නැකතක — ගණ්ඩ මූල දෝෂය පවතී. කලබල විය යුතු නැත; මෙය දරුවන් රැසකට පොදු වන අතර සම්ප්‍රදායික පිළියම් පහත දැක්වේ.',
        en: 'The baby was born in a junction nakshatra — Ganda Moola is present. No cause for alarm; it is common, and the traditional remedies are below.',
      }
      : {
        si: 'බිලිඳා ගණ්ඩ මූල දෝෂයෙන් සම්පූර්ණයෙන් නිදහස්. සන්ධි නැකතක උපත සිදු වී නැත — මෙය සුබ ලකුණකි.',
        en: 'The baby is completely free of Ganda Moola. The birth is not in a junction nakshatra — an auspicious sign.',
      },
    remedies: hasMoola
      ? [
        { si: 'උපතින් දින 27කට පසු එළඹෙන එම නැකත් දිනයේ ශාන්ති පූජාවක් පැවැත්වීම සම්ප්‍රදායයි.', en: 'A shanti puja on the nakshatra\'s return (about the 27th day after birth) is the tradition.' },
        { si: 'පන්සලේ / කෝවිලේ ආශීර්වාද පූජාවක් කර පිරිත් නූලක් පැළඳවීම.', en: 'A blessing at the temple and a protective thread (pirith noola) for the baby.' },
        { si: 'පළපුරුදු ජ්‍යෝතිෂවේදියෙකුගෙන් නැකත් පත්‍රය අනුව නිශ්චිත උපදෙස් ලබාගැනීම.', en: 'Ask an experienced astrologer for rites specific to the chart.' },
      ]
      : [],
  };

  const gandantaSection = {
    checked: !!gandanta,
    present: hasGandanta,
    meaning: {
      si: 'ගණ්ඩාන්ත දෝෂය යනු ජල රාශියක් හා ගිනි රාශියක් අතර සන්ධිස්ථානයේ (රාශි මාරුවේ අවසාන අංශකවල) චන්ද්‍රයා හෝ ලග්නය පිහිටීමයි.',
      en: 'Gandanta means the Moon or Lagna sits at the water–fire sign junction (the final degrees of a sign change).',
    },
    verdict: hasGandanta
      ? {
        si: 'සන්ධිස්ථාන පිහිටීමක් හමු විය. සම්ප්‍රදායට අනුව ශාන්ති කර්මයක් නිර්දේශ වන අතර, මෙයද දරුවන් රැසකට පොදු තත්ත්වයකි.',
        en: 'A junction placement was found. Tradition recommends a calming rite; this too is a common condition.',
      }
      : {
        si: 'චන්ද්‍රයා හෝ ලග්නය සන්ධිස්ථානයක නොපිහිටයි — බිලිඳා මෙම දෝෂයෙන් ද නිදහස්.',
        en: 'Neither the Moon nor the Lagna sits at a junction — the baby is free of this dosha as well.',
      },
    remedies: hasGandanta && gandanta.remedies ? gandanta.remedies.map(r => ({ si: null, en: r })) : [],
  };

  const bothClear = !hasMoola && !hasGandanta;
  return {
    gandaMoola: moola,
    gandanta: gandantaSection,
    summary: bothClear
      ? { si: 'පරීක්ෂා කළ දෝෂ දෙකෙන්ම බිලිඳා නිදහස් — සුබ උපතකි.', en: 'The baby is clear of both checked doshas — an auspicious birth.' }
      : { si: 'දෝෂ පරීක්ෂාවේ ප්‍රතිඵල පහත දැක්වේ — පිළියම් සමඟ.', en: 'Dosha results are below, together with the remedies.' },
  };
}

function buildElements(date, lat, lng) {
  const positions = getAllPlanetPositions(date, lat, lng);
  const counts = { fire: 0, earth: 0, air: 0, water: 0 };
  let total = 0;
  for (const p of Object.values(positions)) {
    if (!p || p.rashiId == null) continue;
    const el = ELEMENT_OF_RASHI[p.rashiId];
    if (el) { counts[el] += 1; total += 1; }
  }
  if (!total) return null;

  let dominant = 'fire';
  for (const el of Object.keys(counts)) {
    if (counts[el] > counts[dominant]) dominant = el;
  }

  return {
    counts,
    total,
    bars: ['fire', 'earth', 'air', 'water'].map(el => ({
      key: el,
      si: ELEMENT_INFO[el].si,
      en: ELEMENT_INFO[el].en,
      count: counts[el],
      percent: Math.round((counts[el] / total) * 100),
    })),
    dominant: {
      key: dominant,
      si: ELEMENT_INFO[dominant].si,
      en: ELEMENT_INFO[dominant].en,
      babyNote: { si: ELEMENT_INFO[dominant].babySi, en: ELEMENT_INFO[dominant].babyEn },
    },
  };
}

// ── Deterministic vitality / constitution note ──────────────────────────────
// Built ONLY from the element balance — never AI. Positive, care-framed, and
// carries a standing medical disclaimer. This is the guardrail: a scary
// "disease" sentence about a newborn is impossible by construction.
const VITALITY_BY_ELEMENT = {
  fire: {
    si: 'ගිනි ධාතුව ප්‍රබල නිසා බිලිඳාට උණුසුම්, ජවසම්පන්න ශරීර ස්වභාවයක් ඇත — හොඳ ආහාර රුචියක් හා ජීර්ණ ශක්තියක් සාමාන්‍යයෙන් දැකිය හැකියි. සිසිල් පරිසරය, ප්‍රමාණවත් ජලය සහ නින්දට පෙර සන්සුන් චර්යාවක් සුවදායකයි.',
    en: 'With Fire strong, the baby tends toward a warm, energetic constitution — usually a good appetite and lively digestion. A cool environment, enough water, and a calm pre-sleep routine suit them well.',
  },
  earth: {
    si: 'පෘථිවි ධාතුව ප්‍රබල නිසා බිලිඳාට ස්ථාවර, ශක්තිමත් ශරීර ස්වභාවයක් ඇත — හොඳ විඳදරාගැනීමක් සාමාන්‍යයෙන් තිබේ. විධිමත් ආහාර වේලාවන් හා නිතිපතා ක්‍රියාශීලීත්වය හොඳ පුරුදුයි.',
    en: 'With Earth strong, the baby tends toward a steady, sturdy constitution — usually good stamina. Regular mealtimes and daily active play are healthy habits to keep.',
  },
  air: {
    si: 'වායු ධාතුව ප්‍රබල නිසා බිලිඳාට සැහැල්ලු, ක්‍රියාශීලී ශරීර ස්වභාවයක් ඇත — සමහර විට සැහැල්ලු නින්දක් හෝ ආහාර රුචියක් විය හැකියි. උණුසුම, විධිමත් දිනචරියාව සහ සන්සුන් පරිසරය සුවදායකයි.',
    en: 'With Air strong, the baby tends toward a light, active constitution — sometimes a lighter sleeper or eater. Warmth, a steady routine, and a calm environment are soothing.',
  },
  water: {
    si: 'ජල ධාතුව ප්‍රබල නිසා බිලිඳාට සංවේදී, මෘදු ශරීර ස්වභාවයක් ඇත. ප්‍රමාණවත් තරලය, මෘදු දිනචරියාවක් සහ උණුසුම් සමීපත්වය හොඳ සුවයක් ගෙන දෙයි.',
    en: 'With Water strong, the baby tends toward a sensitive, gentle constitution. Enough fluids, a soft routine, and warm closeness help them feel well.',
  },
};
const VITALITY_DISCLAIMER = {
  si: 'මෙය සම්ප්‍රදායික ශරීර ස්වභාව සටහනක් පමණි — වෛද්‍ය උපදෙසක් නොවේ. සෞඛ්‍ය සම්බන්ධ ඕනෑම කරුණකට සැමවිටම ළමා රෝග විශේෂඥ වෛද්‍යවරයෙකු හමුවන්න.',
  en: 'This is a traditional constitution note only — not medical advice. For anything health-related, always consult your pediatrician.',
};

function buildVitality(elements) {
  const key = elements && elements.dominant ? elements.dominant.key : 'earth';
  const note = VITALITY_BY_ELEMENT[key] || VITALITY_BY_ELEMENT.earth;
  return {
    deterministic: true,
    dominantElement: key,
    note,
    disclaimer: VITALITY_DISCLAIMER,
  };
}

function buildLucky(identity, nakshatra) {
  const details = identity && identity.lagnaDetails ? identity.lagnaDetails : {};
  const lordName = nakshatra.lord;
  return {
    color: details.luckyColor || null,
    day: details.luckyDay || null,
    gem: details.gem || null,
    guardianPlanet: { name: lordName, sinhala: PLANET_SI[lordName] || lordName },
    note: {
      si: 'මේවා ලග්නය හා නැකත අනුව සම්ප්‍රදායිකව සුබ යැයි සැලකෙන දේවල් — බිලිඳාගේ ඇඳුම්, කාමරයේ වර්ණ වැනි දේ තෝරද්දී මතක තබාගන්න.',
      en: 'Traditionally auspicious picks from the lagna and nakshatra — handy when choosing clothes or nursery colours.',
    },
  };
}

function buildChildhoodDashas(date, birthDate) {
  try {
    const moonSid = toSidereal(getMoonLongitude(date), date);
    const periods = calculateVimshottariDetailed(moonSid, birthDate) || [];
    const birthMs = birthDate.getTime();
    const MS_PER_YEAR = 365.2422 * 86400 * 1000;

    return periods.slice(0, 3).map(p => {
      const startMs = new Date(p.start + 'T00:00:00Z').getTime();
      const endMs = new Date(p.endDate + 'T00:00:00Z').getTime();
      const fromAge = Math.max(0, Math.round(((startMs - birthMs) / MS_PER_YEAR) * 10) / 10);
      const toAge = Math.round(((endMs - birthMs) / MS_PER_YEAR) * 10) / 10;
      const note = DASHA_CHILD_NOTES[p.lord] || { si: '', en: '' };
      return {
        lord: p.lord,
        lordSinhala: PLANET_SI[p.lord] || p.lord,
        start: p.start,
        end: p.endDate,
        fromAge,
        toAge,
        note,
      };
    });
  } catch (e) {
    console.warn('[babyReport] dashas failed:', e.message);
    return [];
  }
}

/**
 * Format a findMuhurtha() output for the report: sorted by date ascending,
 * with local date/time strings and simple "why" chips.
 */
function formatRite(muhurtha, kind) {
  if (!muhurtha || !muhurtha.results || !muhurtha.results.length) return null;

  const results = muhurtha.results
    .slice()
    .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))
    .map(r => {
      const d = new Date(r.dateTime);
      const local = formatLocalDateTime(d);
      const localMidday = new Date(local.date + 'T12:00:00Z');
      const dow = localMidday.getUTCDay();
      const b = r.breakdown || {};
      const why = [];
      if (b.weekday && b.weekday.day && (b.weekday.score || 0) >= 8) why.push({ key: 'weekday', si: 'සුබ දවසක්', en: 'Auspicious weekday' });
      if (b.nakshatra && (b.nakshatra.score || 0) >= 15) why.push({ key: 'nakshatra', si: b.nakshatra.name + ' නැකත සුබයි', en: b.nakshatra.name + ' nakshatra favours it' });
      if (b.tithi && (b.tithi.score || 0) >= 15) why.push({ key: 'tithi', si: 'තිථිය සුබයි', en: 'Favourable tithi' });
      if (b.tarabala && b.tarabala.quality === 'good') why.push({ key: 'tarabala', si: 'බිලිඳාගේ නැකතට ගැළපේ', en: "Matches the baby's star" });
      return {
        dateISO: r.dateTime,
        localDate: local.date,
        localTime: local.time,
        weekday: { en: WEEKDAY_EN[dow], si: WEEKDAY_SI[dow] },
        score: r.score,
        quality: r.quality,
        why: why.slice(0, 3),
      };
    });

  const best = results.reduce((a, b) => (b.score > (a ? a.score : -1) ? b : a), null);
  return { kind, results, best };
}

function buildRites(birthDate, lat, lng) {
  const { findMuhurtha } = require('./muhurtha');
  const DAY = 24 * 60 * 60 * 1000;
  const now = new Date();
  const rites = {};

  // නම් තැබීම — naming ceremony, next 60 days.
  try {
    const naming = findMuhurtha('nameCeremony', now, new Date(now.getTime() + 60 * DAY), birthDate, lat, lng, 4);
    rites.naming = formatRite(naming, 'naming');
  } catch (e) { console.warn('[babyReport] naming rite failed:', e.message); }

  // ඉඳුල් කට ගෑම — first feeding, months ~4-8 from birth (clamped to future).
  try {
    const idealStart = new Date(birthDate.getTime() + 120 * DAY);
    const idealEnd = new Date(birthDate.getTime() + 240 * DAY);
    const start = idealStart > now ? idealStart : now;
    const end = idealEnd > new Date(start.getTime() + 14 * DAY) ? idealEnd : new Date(start.getTime() + 60 * DAY);
    const feeding = findMuhurtha('firstFeeding', start, end, birthDate, lat, lng, 3);
    rites.firstFeeding = formatRite(feeding, 'firstFeeding');
  } catch (e) { console.warn('[babyReport] first feeding rite failed:', e.message); }

  return rites;
}


// ═══════════════════════════════════════════════════════════════════════════
//  MAIN COMPOSER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the complete Baby Kendara report.
 *
 * @param {Date} date  UTC birth instant
 * @param {number} lat
 * @param {number} lng
 * @param {object} identity  precomputed buildBasicChartData() output
 * @param {string} [gender]  'male' | 'female' (mandatory upstream; defaults the
 *                           naming list and is echoed for the AI narrative)
 * @returns {object} report sections (identity is NOT duplicated here)
 */
function buildBabyReport(date, lat, lng, identity, gender) {
  const moonSid = toSidereal(getMoonLongitude(date), date);
  const nakshatra = getNakshatra(moonSid);
  const elements = buildElements(date, lat, lng);

  return {
    version: 3,
    generatedAt: new Date().toISOString(),
    gender: gender === 'male' || gender === 'female' ? gender : null,
    birthMoment: buildBirthMoment(date, lat, lng),
    planets: buildPlanetTable(date, lat, lng),
    starProfile: buildStarProfile(nakshatra),
    naming: buildNaming(nakshatra, gender),
    doshas: buildDoshas(date, lat, lng, nakshatra),
    elements,
    vitality: buildVitality(elements),
    lucky: buildLucky(identity, nakshatra),
    childhoodDashas: buildChildhoodDashas(date, date),
    rites: buildRites(date, lat, lng),
  };
}

module.exports = {
  buildBabyReport,
  NAMING_LETTERS,
  NAME_IDEAS,
  NAKSHATRA_BABY_PROFILES,
};
