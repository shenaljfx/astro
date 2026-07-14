/**
 * PDF Report & Porondam Generator — ග්‍රහචාර
 *
 * Premium branded HTML → PDF engine.
 *
 * FULL LIFE REPORT — "Celestial Almanac" dark keepsake theme:
 * ─ Night-sky ground with deterministic starfield + gold hairline
 *   frame, corner ticks and folios repeated on every page
 * ─ Engraved zodiac-wheel cover with logo medallion + birth record
 * ─ Contents page, Celestial Identity page (lagna/nakshatra/moon
 *   medallions, dotted-leader birth record, dark D1 + D9 kendara)
 * ─ Life Balance dashboard (arc gauge + jewel-toned area cards)
 * ─ Next 12 Months sky calendar (convergence skyline + key windows)
 * ─ Numbered chapters with ghost serif numerals, score arcs, drop
 *   caps (EN), gold small-caps run-in headers, framed quotes
 * ─ Colophon end page (seal, features, document Nº, disclaimer)
 * No external assets: system fonts + inline SVG only, so
 * ExpoPrint.printToFileAsync never touches the network.
 *
 * PORONDAM — light theme, mirrors the in-app report: verdict-first
 * archetype hero, numbered plain-language chapters, dual charts,
 * chaptered written reading, method + guidance footer.
 *
 * Exports:
 *   generateReportHTML(opts)   – Full Life Report PDF (dark almanac)
 *   generatePorondamHTML(opts) – Marriage Compatibility PDF (light)
 *   loadLogoBase64()           – App logo as base64 for embedding
 *   SECTION_COLORS
 */

import { APP_LOGO_BASE64 } from '../assets/logo-base64';
import { deriveArchetype } from './porondamArchetypes';

// In-memory cache so loadLogoBase64() runs at most once per app session.
// The logo is ~50-100 KB; reading + base64-encoding it is slow enough to
// matter at PDF-generation time on low-end Android devices.
var _logoBase64Cache = null;

// ════════════════════════════════════════════════
// LOGO LOADER — cross-platform base64 embedding
// ════════════════════════════════════════════════
async function loadLogoBase64() {
  if (_logoBase64Cache) return _logoBase64Cache;
  // Defensive normalisation: stray whitespace/newlines (from asset
  // regeneration) or an accidental data-URI prefix inside the base64
  // payload silently breaks url(data:...) in the print WebView — the
  // classic "logo missing from the PDF" failure.
  var raw = String(APP_LOGO_BASE64 || '').replace(/\s+/g, '');
  _logoBase64Cache = raw.replace(/^data:image\/[a-z+.-]+;base64,/i, '');
  return _logoBase64Cache;
}

// ════════════════════════════════════════════════
// SECTION COLOUR MAP
// ════════════════════════════════════════════════
var SECTION_COLORS = {
  personality:      { primary: '#3B82F6', accent: '#818CF8', bg: '#EFF6FF', emoji: '✨' },
  yogaAnalysis:     { primary: '#9333EA', accent: '#C084FC', bg: '#F5F3FF', emoji: '⚡' },
  lifePredictions:  { primary: '#8B5CF6', accent: '#A78BFA', bg: '#F5F3FF', emoji: '🔮' },
  career:           { primary: '#F59E0B', accent: '#FBBF24', bg: '#FFFBEB', emoji: '💼' },
  marriage:         { primary: '#EC4899', accent: '#F9A8D4', bg: '#FDF2F8', emoji: '💍' },
  marriedLife:      { primary: '#E11D48', accent: '#FDA4AF', bg: '#FFF1F2', emoji: '🏠' },
  financial:        { primary: '#22C55E', accent: '#4ADE80', bg: '#F0FDF4', emoji: '💰' },
  children:         { primary: '#10B981', accent: '#34D399', bg: '#ECFDF5', emoji: '👶' },
  familyPortrait:   { primary: '#0EA5E9', accent: '#38BDF8', bg: '#F0F9FF', emoji: '👨‍👩‍👧‍👦' },
  health:           { primary: '#EF4444', accent: '#FCA5A5', bg: '#FEF2F2', emoji: '🏥' },
  physicalProfile:  { primary: '#D946EF', accent: '#F0ABFC', bg: '#FDF4FF', emoji: '🪞' },
  attractionProfile:{ primary: '#F43F5E', accent: '#FDA4AF', bg: '#FFF1F2', emoji: '💘' },
  mentalHealth:     { primary: '#06B6D4', accent: '#67E8F9', bg: '#ECFEFF', emoji: '🧠' },
  foreignTravel:    { primary: '#6366F1', accent: '#A5B4FC', bg: '#EEF2FF', emoji: '✈️' },
  education:        { primary: '#7C3AED', accent: '#A78BFA', bg: '#F5F3FF', emoji: '🎓' },
  luck:             { primary: '#FBBF24', accent: '#FDE68A', bg: '#FFFBEB', emoji: '🎰' },
  legal:            { primary: '#64748B', accent: '#94A3B8', bg: '#F8FAFC', emoji: '⚖️' },
  spiritual:        { primary: '#A855F7', accent: '#D8B4FE', bg: '#FAF5FF', emoji: '🙏' },
  realEstate:       { primary: '#84CC16', accent: '#BEF264', bg: '#F7FEE7', emoji: '🏡' },
  transits:         { primary: '#14B8A6', accent: '#5EEAD4', bg: '#F0FDFA', emoji: '🌍' },
  next12Months:     { primary: '#D97706', accent: '#FBBF24', bg: '#FFFBEB', emoji: '📅' },
  surpriseInsights: { primary: '#F97316', accent: '#FDBA74', bg: '#FFF7ED', emoji: '🤯' },
  timeline25:       { primary: '#6366F1', accent: '#A5B4FC', bg: '#EEF2FF', emoji: '📅' },
  remedies:         { primary: '#FBBF24', accent: '#FDE68A', bg: '#FFFBEB', emoji: '💎' },
};

var ZODIAC_SYMBOLS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];

var PLANET_COLORS = {
  Sun:'#F59E0B',Moon:'#A5B4FC',Mars:'#EF4444',Mercury:'#34D399',
  Jupiter:'#FBBF24',Venus:'#F9A8D4',Saturn:'#818CF8',Rahu:'#94A3B8',Ketu:'#C4B5FD',
  Surya:'#F59E0B',Chandra:'#A5B4FC',Mangala:'#EF4444',Budha:'#34D399',
  Guru:'#FBBF24',Shukra:'#F9A8D4',Shani:'#818CF8',
};
var PLANET_SHORT = {
  Sun:'Su',Moon:'Mo',Mars:'Ma',Mercury:'Me',Jupiter:'Ju',Venus:'Ve',Saturn:'Sa',Rahu:'Ra',Ketu:'Ke',
  Surya:'Su',Chandra:'Mo',Mangala:'Ma',Budha:'Me',Guru:'Ju',Shukra:'Ve',Shani:'Sa',Lagna:'Lg',Ascendant:'Lg',
};
var PLANET_SI = {
  Sun:'රවි',Moon:'චන්ද්‍ර',Mars:'කුජ',Mercury:'බුධ',Jupiter:'ගුරු',Venus:'සිකුරු',Saturn:'ශනි',Rahu:'රාහු',Ketu:'කේතු',
  Surya:'රවි',Chandra:'චන්ද්‍ර',Mangala:'කුජ',Budha:'බුධ',Guru:'ගුරු',Shukra:'සිකුරු',Shani:'ශනි',
};

// ── Porondam PDF copy — mirrors SIGNAL_COPY / getSignalCopy and
// getRelationshipChallengeCopy in app/(tabs)/porondam.js. The exported
// PDF must read exactly like the in-app report; keep these in sync.
// Voice: warm counsel (EN) · elevated ඔබ register (SI).
// Tiers speak of care, never doom — care-amber, no alarm-red.
var PDF_TIERS = {
  good:  { label: { en: 'Matches well', si: 'හොඳින් ගැළපේ' }, text: '#0E9F6E', fill: '#34D399', soft: 'rgba(52,211,153,0.10)', line: 'rgba(52,211,153,0.38)' },
  mixed: { label: { en: 'In between', si: 'මධ්‍යමයි' }, text: '#B08430', fill: '#E8C97A', soft: 'rgba(232,201,122,0.16)', line: 'rgba(232,201,122,0.50)' },
  poor:  { label: { en: 'Needs attention', si: 'අවධානය ඕනෑ' }, text: '#B45309', fill: '#F59E0B', soft: 'rgba(245,158,11,0.10)', line: 'rgba(245,158,11,0.40)' },
};

var PDF_SIGNAL_COPY = {
  Dina: {
    plainName: { en: 'Everyday Life Together', si: 'එකට ගෙවෙන දවස' },
    techName: { en: 'Dina Porondam', si: 'දින පොරොන්දම' },
    what: { en: 'This checks how easily your daily routines — waking, meals, work, rest — fit together.', si: 'මෙයින් බලන්නේ දෙදෙනාගේ දවසේ රටාව — නැගිටින වෙලාව, කෑම, වැඩ, විවේකය — කොතරම් පහසුවෙන් එකට ගැළපෙනවාද කියායි.' },
    good: { en: 'Your daily routines match well. Living together should feel easy and comfortable on most days.', si: 'දෙදෙනාගේ දවසේ රටාව හොඳින් ගැළපෙනවා. එකට ජීවත් වෙද්දී බොහෝ දවස්වල පහසුවක් සහ සැහැල්ලුවක් දැනේවි.' },
    mixed: { en: 'Your routines differ a little. Talk early about sleep, meals and money habits — small agreements make daily life smooth.', si: 'දවසේ රටාවල පොඩි වෙනස්කම් තිබෙනවා. නින්ද, කෑම සහ වියදම් ගැන කලින්ම කතා කරගන්න — පොඩි එකඟතාවලින් එදිනෙදා ජීවිතය පහසු වෙනවා.' },
    poor: { en: 'You run on quite different daily clocks. This is workable — but talk honestly about routines from the very start, so neither of you quietly gets worn out.', si: 'දෙදෙනාගේ දවසේ රටා සෑහෙන්න වෙනස්. මේක හදාගත හැකි දෙයක් — නමුත් මුල සිටම දවසේ රටාව ගැන අවංකව කතා කරගන්න. එවිට කාටවත් නොදැනී මහන්සිය එකතු වන්නේ නැහැ.' },
  },
  Gana: {
    plainName: { en: 'Temper & Stress Style', si: 'තරහ සහ පීඩනය දරන විදිය' },
    techName: { en: 'Gana Porondam', si: 'ගණ පොරොන්දම' },
    what: { en: 'This checks whether you two react to stress and anger in a similar way.', si: 'මෙයින් බලන්නේ තරහ ගිය විට හෝ පීඩනයක් ආ විට දෙදෙනා හැසිරෙන විදිය සමානද කියායි.' },
    good: { en: 'You handle stress the same way, so arguments cool down fast instead of growing into big fights.', si: 'දෙදෙනාම පීඩනය දරන විදිය සමානයි. ඒ නිසා අමනාපයක් ආවත් ඉක්මනින් නිවෙනවා — ලොකු රණ්ඩුවක් බවට වැඩෙන්නේ නැහැ.' },
    mixed: { en: 'You react differently when upset. Learn what upsets each other — then a clash becomes a chance to understand, not a fight.', si: 'තරහ ගිය විට දෙදෙනා හැසිරෙන විදිය වෙනස්. එකිනෙකාව කලබල කරන දේවල් හඳුනාගන්න — එවිට ගැටුමක් රණ්ඩුවක් නොවී, තේරුම් ගැනීමට අවස්ථාවක් වෙනවා.' },
    poor: { en: 'One of you stays quiet while the other heats up fast. Neither is wrong — just give tempers time to cool, and be patient with each other’s pace.', si: 'එක් අයෙක් නිහඬ වෙද්දී අනෙකා ඉක්මනින් රත් වෙනවා. දෙදෙනාම වැරදි නැහැ — තරහ නිවෙන්න එකිනෙකාට වෙලාව දෙන්න, එකිනෙකාගේ වේගයට ඉවසීමෙන් ඉඩ දෙන්න.' },
  },
  Yoni: {
    plainName: { en: 'Physical Closeness', si: 'ශාරීරික සමීපකම' },
    techName: { en: 'Yoni Porondam', si: 'යෝනි පොරොන්දම' },
    what: { en: 'This checks the natural physical attraction between you, and how easily closeness comes.', si: 'මෙයින් බලන්නේ දෙදෙනා අතර ස්වාභාවික ශාරීරික ආකර්ෂණය සහ සමීප වීමේ පහසුව ගැනයි.' },
    good: { en: 'A strong natural attraction. Physical and emotional closeness come easily for you two.', si: 'ස්වාභාවික ආකර්ෂණය හොඳටම තිබෙනවා. ශාරීරික සහ හිතේ සමීපකම දෙකම ඔබ දෙදෙනාට පහසුවෙන් ලැබෙනවා.' },
    mixed: { en: 'The attraction is real, but it needs time and care to stay strong. Unhurried time alone together helps a lot.', si: 'ආකර්ෂණය ඇත්තටම තිබෙනවා. නමුත් එය දිගටම තියාගන්න කාලය සහ සැලකිල්ල ඕනෑ. හදිසි නොවී දෙදෙනාම එකට ගත කරන කාලය ලොකු උදව්වක්.' },
    poor: { en: 'Closeness may not come by itself. Talk openly and kindly about what each of you needs — that honest talk is what builds it.', si: 'සමීපකම ඉබේම නොඑන්න පුළුවන්. එකිනෙකාට අවශ්‍ය දේ ගැන විවෘතව, කරුණාවෙන් කතා කරන්න — ඒ අවංක කතාබහෙන් තමයි එය ගොඩනැගෙන්නේ.' },
  },
  Rashi: {
    plainName: { en: 'Understanding Feelings', si: 'හැඟීම් තේරුම් ගැනීම' },
    techName: { en: 'Rashi Porondam', si: 'රාශි පොරොන්දම' },
    what: { en: 'This checks how easily you understand each other’s feelings and moods.', si: 'මෙයින් බලන්නේ එකිනෙකාගේ හැඟීම් සහ මනෝභාව කොතරම් පහසුවෙන් තේරුම් ගන්නවාද කියායි.' },
    good: { en: 'You understand each other’s feelings without long explanations. Home will feel calm and safe.', si: 'දිග පැහැදිලි කිරීම් නැතුවම ඔබ එකිනෙකාගේ හැඟීම් තේරුම් ගන්නවා. නිවස සන්සුන්, ආරක්ෂිත තැනක් වගේ දැනේවි.' },
    mixed: { en: 'You feel things differently. Simply saying “this is how I feel” early stops silent distance from growing.', si: 'දෙදෙනා හැඟීම් විඳින විදිය වෙනස්. “මට දැනෙන්නේ මෙහෙමයි” කියා කලින්ම කීවොත්, නිහඬ දුරස්කමක් වැඩෙන එක නවතිනවා.' },
    poor: { en: 'Your emotional styles are far apart. Listen patiently instead of guessing — asking “what do you feel?” works far better than assuming.', si: 'දෙදෙනාගේ හැඟීම් රටා තරමක් දුරයි. අනුමාන නොකර ඉවසීමෙන් සවන් දෙන්න — “ඔබට මොකද දැනෙන්නේ?” කියා ඇසීම, හිතාගැනීමට වඩා හොඳින් වැඩ කරනවා.' },
  },
  Vasya: {
    plainName: { en: 'Pull Toward Each Other', si: 'එකිනෙකාට ඇදෙන බව' },
    techName: { en: 'Vasya Porondam', si: 'වශ්‍ය පොරොන්දම' },
    what: { en: 'This checks the natural pull between you — how willingly you listen to and go along with each other.', si: 'මෙයින් බලන්නේ දෙදෙනා අතර ස්වාභාවික ඇදීම — එකිනෙකාට කැමැත්තෙන් සවන් දෙන, එකඟ වන ගතිය ගැනයි.' },
    good: { en: 'A strong, willing pull toward each other. You soften each other, and agreeing feels natural.', si: 'එකිනෙකාට කැමැත්තෙන්ම ඇදෙන ප්‍රබල බැඳීමක්. ඔබ එකිනෙකාව මෘදු කරනවා — එකඟ වීම ඉබේම සිදු වෙනවා.' },
    mixed: { en: 'One of you tends to lead more. Take turns — when both feel heard, respect stays strong.', si: 'එක් අයෙක් වැඩිපුර මූලිකත්වය ගන්නවා. මාරුවෙන් මාරුවට ඉඩ දෙන්න — දෙදෙනාටම ඇහුම්කන් ලැබෙනවා යැයි දැනුණොත් ගෞරවය රැකෙනවා.' },
    poor: { en: 'The natural pull is quiet here. That’s okay — the bond stays strong when you choose to care for each other on purpose, every day.', si: 'ස්වාභාවික ඇදීම මෙහි අඩුයි. ඒක ප්‍රශ්නයක් නොවේ — දවසින් දවස හිතාමතාම එකිනෙකාට සැලකුවොත් බැඳීම ශක්තිමත්ව තියාගන්න පුළුවන්.' },
  },
  Nadi: {
    plainName: { en: 'Health of Children & Family', si: 'දරුවන්ගේ සහ පවුලේ සෞඛ්‍යය' },
    techName: { en: 'Nadi Porondam', si: 'නාඩි පොරොන්දම' },
    what: { en: 'In tradition this is one of the most important checks — it looks at the health of the family line and future children.', si: 'සම්ප්‍රදායේ වැදගත්ම පරීක්ෂාවලින් එකක් මෙයයි — ඉදිරි පරම්පරාවේ, එනම් දරුවන්ගේ සෞඛ්‍යය ගැන බලනවා.' },
    good: { en: 'This lines up well — traditionally a very good sign for healthy children and a healthy family.', si: 'මෙය හොඳින් ගැළපෙනවා — නිරෝගී දරුවන්ට සහ නිරෝගී පවුලකට ඉතා හොඳ ලකුණක් ලෙසයි සම්ප්‍රදායේ සලකන්නේ.' },
    mixed: { en: 'A middle result. Good habits and regular medical check-ups keep this side well covered.', si: 'මධ්‍යම ප්‍රතිඵලයක්. හොඳ පුරුදු සහ නියමිත වෛද්‍ය පරීක්ෂණවලින් මේ පැත්ත හොඳින් බලාගන්න පුළුවන්.' },
    poor: { en: 'Tradition treats this signal seriously. It is worth showing both horoscopes to an experienced astrologer, who can weigh it with everything else.', si: 'මේ ලකුණ සම්ප්‍රදායේ බැරෑරුම්ව සලකනවා. කේන්දර දෙකම පළපුරුදු ජ්‍යෝතිෂවේදියෙකුට පෙන්වා, අනෙක් සියල්ල සමඟ කිරා බලා ගැනීම වටිනවා.' },
  },
  Mahendra: {
    plainName: { en: 'Growing & Doing Well Together', si: 'එකට දියුණු වීම' },
    techName: { en: 'Mahendra Porondam', si: 'මහේන්ද්‍ර පොරොන්දම' },
    what: { en: 'This checks support for prosperity — income, progress, and the blessing of children.', si: 'මෙයින් බලන්නේ දියුණුවට ඇති සහයෝගයයි — ආදායම, ඉදිරි ගමන සහ දරු භාග්‍යය.' },
    good: { en: 'Good support for growing together — your efforts tend to add up instead of pulling apart.', si: 'එකට දියුණු වීමට හොඳ සහයක් තිබෙනවා — දෙදෙනාගේ උත්සාහය එකට එකතු වෙනවා මිස, විසිරෙන්නේ නැහැ.' },
    mixed: { en: 'Progress will come from planning together. Decide your goals as a pair and write them down — it truly helps.', si: 'දියුණුව එන්නේ එකට සැලසුම් කිරීමෙන්. අරමුණු දෙදෙනාම එකතු වී තීරණය කර ලියා තබාගන්න — එය ඇත්තටම උදව් වෙනවා.' },
    poor: { en: 'Success won’t come on its own here — it comes when you actively support each other’s work and dreams.', si: 'මෙහි සාර්ථකත්වය ඉබේම එන්නේ නැහැ — එකිනෙකාගේ රැකියාවට සහ සිහිනවලට සක්‍රියව උදව් කරන විට තමයි එය එන්නේ.' },
  },
  Rajju: {
    plainName: { en: 'Long Life of the Marriage', si: 'විවාහයේ දිගු පැවැත්ම' },
    techName: { en: 'Rajju Porondam', si: 'රජ්ජු පොරොන්දම' },
    what: { en: 'Tradition treats this as the most serious check — it reads the long life and stability of the marriage itself.', si: 'සම්ප්‍රදායේ වඩාත්ම බැරෑරුම් පරීක්ෂාව මෙයයි — විවාහයේ දිගු පැවැත්ම සහ ස්ථාවර බව ගැන බලනවා.' },
    good: { en: 'Your rajju groups are different — traditionally the strongest sign of a long, steady marriage.', si: 'දෙදෙනාගේ රජ්ජු කාණ්ඩ වෙනස් — දිගු, ස්ථාවර විවාහයකට සම්ප්‍රදායේ තිබෙන ප්‍රබලම හොඳ ලකුණ.' },
    mixed: { en: 'A partial result — worth a closer look from an experienced astrologer.', si: 'අර්ධ ප්‍රතිඵලයක් — පළපුරුදු ජ්‍යෝතිෂවේදියෙකු ලවා සමීපව බලවා ගැනීම වටිනවා.' },
    poor: { en: 'You share the same rajju group. This is the one signal tradition takes most seriously — families usually show both horoscopes to an experienced astrologer before deciding.', si: 'දෙදෙනාම එකම රජ්ජු කාණ්ඩයේ. සම්ප්‍රදායේ වඩාත්ම බැරෑරුම්ව සලකන ලකුණ මෙයයි — සාමාන්‍යයෙන් පවුල් තීරණයකට පෙර කේන්දර දෙකම පළපුරුදු ජ්‍යෝතිෂවේදියෙකුට පෙන්වනවා.' },
  },
  Vedha: {
    plainName: { en: 'No Blocking Stars', si: 'බාධා නැති බව' },
    techName: { en: 'Vedha Porondam', si: 'වේධ පොරොන්දම' },
    what: { en: 'This checks that your two birth stars do not block each other.', si: 'මෙයින් බලන්නේ දෙදෙනාගේ උපන් නැකැත් එකිනෙකාට බාධා නොකරනවාද කියායි.' },
    good: { en: 'No blocking — your birth stars leave the road clear for each other.', si: 'බාධාවක් නැහැ — දෙදෙනාගේ නැකැත් එකිනෙකාට ඉඩ දී, මග නිදහස්ව තබනවා.' },
    mixed: { en: 'A small crossing — being aware of it is enough to keep things smooth.', si: 'පොඩි හරස්වීමක් තිබෙනවා — ඒ ගැන දැනුවත්ව සිටීමම ප්‍රමාණවත්.' },
    poor: { en: 'Your birth stars push against each other — tradition takes this seriously, so an experienced astrologer should weigh it with the full picture.', si: 'දෙදෙනාගේ නැකැත් එකිනෙකාට විරුද්ධව අදිනවා — සම්ප්‍රදායේ මෙය බැරෑරුම් ලකුණක්. සම්පූර්ණ චිත්‍රය සමඟ කිරා බලන්න පළපුරුදු ජ්‍යෝතිෂවේදියෙකු හමුවෙන්න.' },
  },
};

function pdfSignalCopy(name, isSi, score, maxScore) {
  var pct = maxScore > 0 ? score / maxScore : 0;
  var tier = pct >= 0.75 ? 'good' : pct >= 0.25 ? 'mixed' : 'poor';
  var lang = isSi ? 'si' : 'en';
  var t = PDF_TIERS[tier];
  var sc = PDF_SIGNAL_COPY[name];
  if (!sc) {
    return { plainName: name, techName: name + ' Porondam', what: '', insight: '', tier: tier, tierLabel: t.label[lang], colors: t };
  }
  return {
    plainName: sc.plainName[lang],
    techName: sc.techName[lang],
    what: sc.what[lang],
    insight: sc[tier][lang],
    tier: tier,
    tierLabel: t.label[lang],
    colors: t,
  };
}

var PDF_CHALLENGE_MAP = {
  mangal: {
    si: { label: 'චර්යාව හා කෝපය පාලනය', desc: 'එක් අයකුගේ තීව්‍ර ශක්තිය නිසා ඉක්මනින් කේන්ති ගැනීම හෝ ආධිපත්‍ය පැවරීම විය හැක. ඉවසීමෙන් කතා කිරීම වැදගත්.' },
    en: { label: 'Temperament & Anger Control', desc: 'One partner may have intense energy leading to quick reactions or dominance. Patient communication is key.' },
  },
  kaal: {
    si: { label: 'ජීවිතයේ හදිසි මාරු', desc: 'ජීවිතයේ අනපේක්ෂිත වෙනස්කම් එකින් එක පැමිණිය හැක. එකිනෙකා සවිමත්ව රැඳී සිටීම වැදගත්.' },
    en: { label: 'Sudden Life Shifts', desc: 'Life may bring unexpected changes one after another. Staying resilient together is important.' },
  },
  sade: {
    si: { label: 'ජීවිතයේ අභියෝගකාරී කාල පරිච්ඡේදය', desc: 'දැනට අභියෝගකාරී කාලයක ගමන් කරමින් සිටී. අන්‍යෝන්‍ය උදව් හා ඉවසීම ඉතා වැදගත්.' },
    en: { label: 'Challenging Life Phase', desc: 'Currently going through a demanding period. Mutual support and patience are crucial.' },
  },
  pitru: {
    si: { label: 'පවුල් රටා හා උරුමය', desc: 'පවුලේ පරම්පරාවෙන් ආ සබඳතා රටා බලපෑම් කළ හැක. අලුත් පුරුදු ගොඩනගා ගැනීම හොඳයි.' },
    en: { label: 'Family Patterns & Legacy', desc: 'Inherited family relationship patterns may influence the bond. Building new habits together helps.' },
  },
  grahan: {
    si: { label: 'මානසික පීඩනය හා අවිනිශ්චිතභාවය', desc: 'සිතේ ව්‍යාකූලත්වය හෝ තීරණ ගැනීමේ දුෂ්කරතා ඇති විය හැක. පැහැදිලි සන්නිවේදනය අත්‍යවශ්‍යයි.' },
    en: { label: 'Mental Pressure & Confusion', desc: 'There may be confusion or difficulty making decisions together. Clear communication is essential.' },
  },
  shrapit: {
    si: { label: 'පැරණි හැඟීම්මය බැමි', desc: 'අතීත සබඳතා අත්දැකීම් නිසා පැවරෙන බිය හෝ විශ්වාස ගැටලු විය හැක. අලුත් ආරම්භයක් ගොඩනගන්න.' },
    en: { label: 'Emotional Baggage from the Past', desc: 'Past relationship experiences may carry fear or trust issues. Focus on building a fresh start.' },
  },
  guru: {
    si: { label: 'විවේකය හා නුවණ යොදා ගැනීම', desc: 'සමහරවිට නොමේරූ තීරණ ගැනීමට නැඹුරුවක් ඇත. වැදගත් කරුණු ගැන හිතාමතා සාකච්ඡා කරන්න.' },
    en: { label: 'Wisdom & Judgement', desc: 'There may be a tendency toward impulsive decisions. Important matters need deliberate discussion.' },
  },
  kemdrum: {
    si: { label: 'තනිකම හා හැඟීම්මය හුදෙකලාව', desc: 'එක් පාර්ශවයකට හැඟීම්මය වශයෙන් හුදෙකලා වූ හැඟීමක් ඇති විය හැක. සැලකිල්ල ප්‍රකාශ කිරීම අමතක නොකරන්න.' },
    en: { label: 'Emotional Isolation', desc: 'One partner may sometimes feel emotionally alone. Regularly expressing care is vital.' },
  },
};

function pdfChallengeCopy(item, isSi) {
  var severity = item && item.severity ? String(item.severity).toLowerCase() : '';
  var name = item && item.name ? String(item.name).toLowerCase() : '';
  var matchedKey = Object.keys(PDF_CHALLENGE_MAP).find(function (k) { return name.indexOf(k) !== -1; });
  var mapped = matchedKey ? PDF_CHALLENGE_MAP[matchedKey] : null;

  if (item && item.cancelled) {
    if (isSi) {
      return {
        label: mapped ? mapped.si.label + ' — නිවාරණය වී ඇත' : 'සැලකිල්ල අඩු වූ කරුණ',
        desc: 'මේ බලපෑම සැලකිය යුතු ලෙස අඩු වී ඇත. සාමාන්‍ය සැලකිල්ලෙන් ප්‍රමාණවත්.',
      };
    }
    return {
      label: mapped ? mapped.en.label + ' — Resolved' : 'Reduced Care Point',
      desc: 'This influence has been significantly reduced. Normal care is sufficient.',
    };
  }

  if (mapped) return isSi ? mapped.si : mapped.en;

  if (isSi) {
    return {
      label: severity.indexOf('severe') !== -1 ? 'වැඩි සැලකිල්ලක් අවශ්‍ය කරුණ' : 'සබඳතාවේ සැලකිලිමත් කරුණ',
      desc: 'මෙය සබඳතාවේ ඉවසීම, විශ්වාසය සහ තීරණ ගැනීමේදී වැඩි සැලකිල්ලක් අවශ්‍ය බව පෙන්වනවා.',
    };
  }
  return {
    label: severity.indexOf('severe') !== -1 ? 'High-Care Relationship Point' : 'Relationship Care Point',
    desc: 'This suggests an area where patience, trust, and careful decisions are important for the relationship.',
  };
}

// ════════════════════════════════════════════════
// SHARED CSS
// ════════════════════════════════════════════════
function sharedCSS(accentHue) {
  var isPink = accentHue === 'pink';
  var theme = isPink
    ? {
      primary: '#BE185D', accent: '#EC4899', accent2: '#0F766E', soft: '#FFF1F7', soft2: '#F0FDFA',
      night: '#240815', night2: '#4A102B', gold: '#D6A83A', goldSoft: '#FAE8B7', wash: '#FFFBF6', seal: '#831843',
    }
    : {
      primary: '#5B21B6', accent: '#7C3AED', accent2: '#0F766E', soft: '#F3EEFF', soft2: '#ECFDF5',
      night: '#15102C', night2: '#2B155E', gold: '#D6A83A', goldSoft: '#FAE8B7', wash: '#FFFBF3', seal: '#312E81',
    };

  return ''
    +':root{--ink:#201A2E;--ink-2:#3B334B;--muted:#756D84;--hair:#E8DDCA;--paper:#FFFBF3;--paper-2:#F8F0E3;--cream:#FFF7E8;--ac:'+theme.primary+';--ac2:'+theme.accent+';--teal:'+theme.accent2+';--soft:'+theme.soft+';--soft2:'+theme.soft2+';--night:'+theme.night+';--night2:'+theme.night2+';--gold:'+theme.gold+';--gold-soft:'+theme.goldSoft+';--wash:'+theme.wash+';--seal:'+theme.seal+';}'
    +'@page{margin:0;size:A4;}*{box-sizing:border-box;margin:0;padding:0;}html,body{min-height:100%;}'
    +'body{font-family:-apple-system,"Roboto","Noto Sans Sinhala","Iskoola Pota",sans-serif;color:var(--ink);line-height:1.66;font-size:12.5px;background:var(--paper);-webkit-print-color-adjust:exact;print-color-adjust:exact;}'
    +'body::before{content:"";position:fixed;inset:0;background:linear-gradient(90deg,rgba(214,168,58,0.035),transparent 20%,transparent 80%,rgba(91,33,182,0.025)),radial-gradient(circle at 12% 16%,rgba(214,168,58,0.08),transparent 22%),radial-gradient(circle at 88% 82%,rgba(15,118,110,0.07),transparent 24%);z-index:-2;}'
    +'.wm{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:92px;font-weight:900;color:rgba(32,26,46,0.022);letter-spacing:15px;white-space:nowrap;z-index:-1;pointer-events:none;user-select:none;}'
    +'.oc{position:fixed;width:44px;height:44px;z-index:5;opacity:.45;}.oc-tl{top:12px;left:12px;border-top:1px solid rgba(214,168,58,.48);border-left:1px solid rgba(214,168,58,.48);}.oc-tr{top:12px;right:12px;border-top:1px solid rgba(214,168,58,.48);border-right:1px solid rgba(214,168,58,.48);}.oc-bl{bottom:12px;left:12px;border-bottom:1px solid rgba(214,168,58,.48);border-left:1px solid rgba(214,168,58,.48);}.oc-br{bottom:12px;right:12px;border-bottom:1px solid rgba(214,168,58,.48);border-right:1px solid rgba(214,168,58,.48);}'
    +'.ph{position:fixed;top:0;left:0;right:0;height:42px;display:flex;align-items:center;justify-content:space-between;padding:0 44px;background:rgba(255,251,243,.92);border-bottom:1px solid rgba(214,168,58,.22);font-size:8px;color:rgba(32,26,46,.52);letter-spacing:1.8px;text-transform:uppercase;z-index:10;}.ph .lm{display:flex;align-items:center;font-weight:900;color:var(--ac);font-size:9px;letter-spacing:2.4px;}.pf{position:fixed;bottom:0;left:0;right:0;height:32px;display:flex;align-items:center;justify-content:center;background:rgba(255,251,243,.92);border-top:1px solid rgba(214,168,58,.18);font-size:7px;color:rgba(32,26,46,.4);letter-spacing:1.4px;text-transform:uppercase;z-index:10;}'
    +'.cover{width:100%;min-height:100vh;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;page-break-after:always;background:linear-gradient(135deg,var(--night),var(--night2) 54%,#0C251F);color:#FFF9EA;padding:72px 58px;}.cover::before{content:"";position:absolute;inset:28px;border:1px solid rgba(214,168,58,.22);border-radius:28px;background:radial-gradient(circle at 50% 40%,rgba(214,168,58,.13),transparent 32%),linear-gradient(135deg,rgba(255,255,255,.05),transparent 36%,rgba(255,255,255,.03));}.cover::after{content:"";position:absolute;width:760px;height:760px;border-radius:50%;border:1px solid rgba(214,168,58,.12);top:50%;left:50%;transform:translate(-50%,-50%);box-shadow:0 0 0 58px rgba(214,168,58,.025),0 0 0 116px rgba(255,255,255,.018),0 0 0 174px rgba(15,118,110,.018);}'
    +'.zr,.zri{position:absolute;border-radius:50%;top:50%;left:50%;transform:translate(-50%,-50%);}.zr{width:470px;height:470px;border:1px solid rgba(214,168,58,.22);}.zri{width:336px;height:336px;border:1px dashed rgba(255,249,234,.17);}.zs{position:absolute;width:560px;height:560px;top:50%;left:50%;transform:translate(-50%,-50%);}.zs span{position:absolute;font-size:18px;color:rgba(250,232,183,.34);font-weight:700;}'
    +'.cc{position:relative;z-index:2;width:100%;max-width:560px;text-align:center;padding:28px 24px;}.cl{width:88px;height:88px;border-radius:24px;overflow:hidden;margin:0 auto 24px;border:1px solid rgba(250,232,183,.62);box-shadow:0 22px 70px rgba(0,0,0,.35),0 0 0 10px rgba(214,168,58,.07);display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.22);}.cl img{width:100%;height:100%;object-fit:cover;}.cb{font-size:10px;font-weight:900;color:var(--gold-soft);letter-spacing:7px;text-transform:uppercase;margin-bottom:18px;}.ct{font-size:42px;font-weight:900;line-height:1.05;letter-spacing:-.7px;margin-bottom:14px;text-shadow:0 18px 46px rgba(0,0,0,.34);}.ctg{color:#FFF2C8;}.cs{font-size:13px;color:rgba(255,249,234,.72);margin-bottom:28px;font-weight:600;letter-spacing:.6px;text-transform:uppercase;}.cd{width:126px;height:1px;background:linear-gradient(90deg,transparent,var(--gold-soft),transparent);margin:0 auto 26px;}.cn{font-size:30px;font-weight:900;color:#FFF8D6;margin-bottom:16px;}.cdt{display:inline-block;text-align:left;font-size:12px;color:rgba(255,249,234,.68);line-height:1.85;padding:14px 18px;border:1px solid rgba(250,232,183,.18);border-radius:18px;background:rgba(8,7,18,.22);}.cdt strong{color:#FFF8D6;}.cfb{position:absolute;bottom:38px;left:0;right:0;text-align:center;font-size:8px;color:rgba(255,249,234,.36);letter-spacing:3px;text-transform:uppercase;z-index:2;}'
    +'.cp{padding:58px 48px 48px;position:relative;}.toc{page-break-after:always;}.toc-hdr{text-align:left;margin-bottom:28px;display:flex;align-items:flex-end;justify-content:space-between;border-bottom:1px solid var(--hair);padding-bottom:16px;}.toc-hdr h2{font-size:28px;font-weight:900;color:var(--ink);letter-spacing:-.4px;text-transform:none;}.toc-line{width:92px;height:6px;background:var(--gold);border-radius:99px;}.toc-list{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:10px 18px;padding:0;}.toc-item{display:grid;grid-template-columns:34px 24px 1fr;align-items:center;gap:10px;padding:10px 8px;border:1px solid rgba(32,26,46,.06);border-radius:14px;background:rgba(255,255,255,.52);}.toc-num{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#fff;}.toc-emoji{font-size:15px;text-align:center;}.toc-label{font-size:12px;font-weight:800;color:var(--ink-2);}'
    +'.bc{background:linear-gradient(135deg,rgba(255,255,255,.88),rgba(255,248,232,.92));border:1px solid rgba(214,168,58,.3);border-radius:26px;padding:28px;margin-bottom:30px;position:relative;overflow:hidden;box-shadow:0 18px 50px rgba(72,52,24,.08);}.bc::after{content:"☸";position:absolute;top:-36px;right:-14px;font-size:132px;color:rgba(214,168,58,.08);pointer-events:none;}.bc h3{font-size:13px;font-weight:900;color:var(--ac);margin-bottom:16px;letter-spacing:1.5px;text-transform:uppercase;}.bt{width:100%;border-collapse:separate;border-spacing:0 7px;}.bt td{padding:8px 12px;font-size:12px;vertical-align:top;background:rgba(255,255,255,.58);}.bt .bl{color:var(--muted);font-weight:800;width:148px;white-space:nowrap;border-radius:12px 0 0 12px;}.bt .bv{color:var(--ink);font-weight:700;border-radius:0 12px 12px 0;}'
    +'.chart-wrap{text-align:center;margin:24px auto;padding:20px;background:linear-gradient(135deg,#FFF9E9,#FFFFFF);border:1px solid rgba(214,168,58,.28);border-radius:24px;page-break-inside:avoid;max-width:460px;overflow:visible;box-shadow:0 16px 44px rgba(32,26,46,.07);}.chart-title{font-size:11px;font-weight:900;color:var(--ac);letter-spacing:1.7px;text-transform:uppercase;margin-bottom:10px;}'
    +'.sg{display:inline-flex;align-items:center;justify-content:center;position:relative;vertical-align:middle;}.sg-txt{position:absolute;text-align:center;}.sg-val{font-weight:900;line-height:1;}.sg-lbl{font-size:9px;color:var(--muted);margin-top:2px;font-weight:800;}'
    +'.hero-scores{page-break-after:always;padding:58px 48px;background:linear-gradient(180deg,var(--paper),#FFF);}.hero-title{text-align:left;font-size:28px;font-weight:900;color:var(--ink);letter-spacing:-.5px;margin-bottom:6px;}.hero-sub{text-align:left;font-size:12px;color:var(--muted);margin-bottom:24px;}.hero-overall{text-align:center;padding:30px;background:linear-gradient(135deg,#FFFFFF,var(--soft));border-radius:30px;border:1px solid rgba(32,26,46,.07);box-shadow:0 18px 50px rgba(32,26,46,.07);}.hero-overall .ho-label{font-size:17px;font-weight:900;color:var(--ink);margin-top:6px;}.hero-overall .ho-sub{font-size:11px;color:var(--muted);margin-top:3px;font-weight:700;}.hero-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:28px;}.hero-cell{text-align:left;padding:14px;border-radius:18px;border:1px solid rgba(32,26,46,.06);background:#fff!important;box-shadow:0 10px 26px rgba(32,26,46,.04);}.hero-cell .hc-emoji{font-size:20px;margin-bottom:8px;}.hero-cell .hc-name{font-size:9px;font-weight:900;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px;min-height:24px;}.hero-cell .hc-score{font-size:29px;font-weight:900;line-height:1;}.hero-cell .hc-bar{height:6px;background:rgba(32,26,46,.06);border-radius:99px;margin-top:9px;overflow:hidden;}.hero-cell .hc-fill{height:6px;border-radius:99px;}'
    +'.rs{page-break-inside:avoid;margin-bottom:24px;border-radius:24px;overflow:hidden;border:1px solid rgba(32,26,46,.08);background:#fff;box-shadow:0 16px 44px rgba(32,26,46,.055);}.rs-hdr{padding:18px 22px!important;display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,var(--ink),var(--seal))!important;}.rs-hdr .sn{width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:#FFF7E8;border:1px solid rgba(255,255,255,.18);}.rs-hdr .se{font-size:18px;}.rs-hdr h2{flex:1;font-size:16px;font-weight:900;color:#FFF7E8;margin:0;letter-spacing:-.1px;}.rs-hdr .ss{font-size:12px;font-weight:900;color:#2B1B0C;background:var(--gold-soft);padding:4px 10px;border-radius:99px;}.rs-body{padding:22px 24px!important;font-size:12.5px;line-height:1.82;color:var(--ink-2);background:#FFFEFA!important;}.rs-body strong{color:var(--ink);font-weight:900;}.rs-body em{color:var(--ac);font-style:normal;font-weight:800;}.rs-body blockquote{margin:12px 0;padding:12px 16px;border:1px solid rgba(214,168,58,.32);background:rgba(255,248,232,.8);border-radius:16px;font-style:italic;color:#51465F;}'
    +'.prose{max-width:100%;}.body-p{margin-bottom:10px;}.md-h2{font-size:16px;font-weight:900;color:var(--ink);margin:18px 0 8px;}.md-h3{font-size:14px;font-weight:900;color:var(--ac);margin:14px 0 6px;}.md-bullet{display:flex;gap:8px;margin:6px 0;padding:8px 10px;background:rgba(32,26,46,.035);border-radius:12px;}.md-bullet span{color:var(--gold);font-weight:900;}'
    +'.verdict{border-radius:20px;padding:16px 18px;margin-bottom:16px;position:relative;overflow:hidden;background:linear-gradient(135deg,var(--soft),#fff)!important;border:1px solid rgba(32,26,46,.07);}.verdict-hdr{display:flex;align-items:center;gap:10px;margin-bottom:10px;}.verdict-emoji{font-size:24px;}.verdict-title{font-size:12px;font-weight:900;color:var(--ink)!important;flex:1;text-transform:uppercase;letter-spacing:1px;}.verdict-score{font-size:24px;font-weight:900;color:var(--ac)!important;}.verdict-bar-wrap{height:8px;background:rgba(32,26,46,.07);border-radius:99px;overflow:hidden;}.verdict-bar{height:8px;border-radius:99px;background:var(--ac)!important;}.verdict-rating{display:inline-block;margin-top:10px;padding:4px 11px;border-radius:99px;background:#fff;color:var(--ink)!important;font-size:9px;font-weight:900;letter-spacing:.8px;border:1px solid rgba(32,26,46,.08);}'
    +'.factor-row{margin-bottom:12px;padding:16px 18px;background:#fff;border-radius:18px;border:1px solid rgba(32,26,46,.08);page-break-inside:avoid;box-shadow:0 8px 24px rgba(32,26,46,.035);}.factor-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:9px;gap:12px;}.factor-title{font-size:13px;color:var(--ink);font-weight:900;}.factor-score{display:flex;align-items:center;gap:7px;}.factor-score strong{font-size:17px;font-weight:900;color:var(--factor-color,var(--ac));}.factor-track{height:7px;background:rgba(32,26,46,.06);border-radius:99px;overflow:hidden;margin-bottom:8px;}.factor-fill{height:7px;border-radius:99px;background:var(--factor-color,var(--ac));}.factor-desc{color:var(--muted);font-size:11px;line-height:1.58;margin:0;}'
    +'.care-card{margin-bottom:10px;padding:14px 16px;background:#FFF7F5;border-radius:18px;border:1px solid rgba(220,38,38,.15);}.care-card strong{display:block;color:#8A1F1F;font-size:13px;margin-bottom:4px;}.care-card p{color:#614747;font-size:11px;line-height:1.58;margin:0;}.insight-strip{padding:10px 12px;border:1px solid rgba(236,72,153,.14);border-radius:14px;background:#fff;margin-bottom:8px;font-size:11px;color:var(--ink-2);}'
    +'.ep{width:100%;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--night),var(--night2),#0C251F);color:#FFF9EA;text-align:center;page-break-before:always;position:relative;overflow:hidden;padding:64px;}.ep::before{content:"";position:absolute;inset:34px;border:1px solid rgba(214,168,58,.24);border-radius:30px;}.ep img{position:relative;z-index:1;box-shadow:0 18px 54px rgba(0,0,0,.35);}.ep .ep-icon{font-size:48px;margin-bottom:8px;}.ep .ep-brand{position:relative;z-index:1;font-size:10px;letter-spacing:7px;color:var(--gold-soft);text-transform:uppercase;font-weight:900;}.ep .ep-line{position:relative;z-index:1;width:96px;height:1px;background:linear-gradient(90deg,transparent,var(--gold-soft),transparent);margin:22px auto;}.ep .ep-tag{position:relative;z-index:1;font-size:18px;color:rgba(255,249,234,.72);font-weight:800;}.ep .ep-url{position:relative;z-index:1;font-size:10px;color:rgba(255,249,234,.45);letter-spacing:2px;margin-top:20px;}.ep .ep-disc{position:relative;z-index:1;max-width:420px;font-size:8px;color:rgba(255,249,234,.32);line-height:1.7;margin-top:30px;}.ep .ep-cta{position:relative;z-index:1;margin-top:28px;padding:11px 26px;border:1px solid rgba(250,232,183,.42);border-radius:999px;color:var(--gold-soft);font-weight:900;font-size:10px;letter-spacing:1.4px;text-transform:uppercase;background:rgba(0,0,0,.12);}.ep .ep-features{position:relative;z-index:1;display:flex;gap:18px;margin-top:16px;}.ep .ep-feat{font-size:9px;color:rgba(255,249,234,.48);font-weight:700;}'
    +'@media print{.cover{page-break-after:always;}.toc{page-break-after:always;}.rs,.factor-row,.care-card,.chart-wrap{page-break-inside:avoid;}.ep{page-break-before:always;}}';
}

// ════════════════════════════════════════════════
// ✦ CELESTIAL ALMANAC — full-report dark theme
// The Complete Life Report renders as a keepsake
// night-sky almanac: deep violet ground, gold
// metalwork, serif numerals, engraved zodiac wheel,
// jewel-toned kendara charts. Everything below this
// line is used only by generateReportHTML — the
// porondam PDF keeps the light theme above.
// ════════════════════════════════════════════════

var RPT_TIERS = [
  { min: 80, color: '#4EC98F', en: 'Exceptional', si: 'ඉතා ප්‍රබල' },
  { min: 60, color: '#6FA8FF', en: 'Strong', si: 'ප්‍රබල' },
  { min: 40, color: '#E8B54D', en: 'Balanced', si: 'සමතුලිත' },
  { min: 0,  color: '#E8836E', en: 'Needs care', si: 'සැලකිල්ල ඕනෑ' },
];
function rptTier(score) {
  for (var i = 0; i < RPT_TIERS.length; i++) { if (score >= RPT_TIERS[i].min) return RPT_TIERS[i]; }
  return RPT_TIERS[RPT_TIERS.length - 1];
}

// Jewel accents tuned for the dark ground — SECTION_COLORS primaries were
// picked for white paper and sit muddy on near-black.
var RPT_ACCENTS = {
  personality: '#7FB2FF', yogaAnalysis: '#C08BFF', lifePredictions: '#B39DFF',
  career: '#F0B95C', marriage: '#FF8FB8', marriedLife: '#FF9E9E', financial: '#5CD69A',
  children: '#5FD6B5', familyPortrait: '#6FC6FF', health: '#FF8E7A', physicalProfile: '#E79BF0',
  attractionProfile: '#FF92A8', mentalHealth: '#6FDCE8', foreignTravel: '#9FA9FF',
  education: '#B79DFF', luck: '#F2CE6A', legal: '#ADB9CC', spiritual: '#CBA3FF',
  realEstate: '#B7DB6A', transits: '#63D6C3', next12Months: '#F0B95C',
  surpriseInsights: '#FFAE70', timeline25: '#9FA9FF', remedies: '#F2CE6A',
};
function rptAccent(key) { return RPT_ACCENTS[key] || '#F0D48A'; }

var RPT_PLANET_DARK = {
  Sun: '#F6C453', Moon: '#C9D4FF', Mars: '#FF8A7A', Mercury: '#63DFA9',
  Jupiter: '#F4CE6A', Venus: '#FFA9CC', Saturn: '#A3ACFF', Rahu: '#B9C3D0', Ketu: '#D9C6FF',
  Surya: '#F6C453', Chandra: '#C9D4FF', Mangala: '#FF8A7A', Budha: '#63DFA9',
  Guru: '#F4CE6A', Shukra: '#FFA9CC', Shani: '#A3ACFF',
};

var RPT_DOMAINS = {
  career: { color: '#F0B95C', si: 'රැකියාව', en: 'Career' },
  love:   { color: '#FF8FB8', si: 'ආදරය', en: 'Love' },
  money:  { color: '#5CD69A', si: 'මුදල්', en: 'Money' },
  health: { color: '#FF8E7A', si: 'සෞඛ්‍යය', en: 'Health' },
  travel: { color: '#9FA9FF', si: 'විදේශ', en: 'Travel' },
  family: { color: '#6FC6FF', si: 'පවුල', en: 'Family' },
};

// Canonical short names for the Life Balance dashboard — AI section titles
// can run long, and some scored areas (e.g. spiritual) have no section.
var RPT_AREA_NAMES = {
  career: { si: 'රැකියාව', en: 'Career' },
  marriage: { si: 'විවාහය', en: 'Marriage' },
  health: { si: 'සෞඛ්‍යය', en: 'Health' },
  financial: { si: 'මූල්‍ය', en: 'Finances' },
  luck: { si: 'වාසනාව', en: 'Luck' },
  education: { si: 'අධ්‍යාපනය', en: 'Education' },
  children: { si: 'දරුවන්', en: 'Children' },
  foreignTravel: { si: 'විදේශ ගමන්', en: 'Foreign Travel' },
  spiritual: { si: 'අධ්‍යාත්මික ජීවිතය', en: 'Spiritual Life' },
};

// Deterministic starfield — seeded LCG, so re-exporting the same report
// produces an identical document.
function rptStars(w, h, count, seed) {
  var s = (seed || 7) % 2147483647; if (s <= 0) s += 2147483646;
  var rnd = function() { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  var out = '';
  for (var i = 0; i < count; i++) {
    out += '<circle cx="' + (rnd() * w).toFixed(1) + '" cy="' + (rnd() * h).toFixed(1)
      + '" r="' + (0.4 + rnd() * 0.9).toFixed(2) + '" fill="#F4E9CF" opacity="' + (0.12 + rnd() * 0.5).toFixed(2) + '"/>';
  }
  var sparkles = Math.max(3, Math.round(count / 15));
  for (var j = 0; j < sparkles; j++) {
    var sx = rnd() * w, sy = rnd() * h, ss = 2.4 + rnd() * 3;
    var x0 = sx.toFixed(1), y0 = sy.toFixed(1);
    out += '<path d="M ' + x0 + ' ' + (sy - ss).toFixed(1)
      + ' Q ' + x0 + ' ' + y0 + ' ' + (sx + ss).toFixed(1) + ' ' + y0
      + ' Q ' + x0 + ' ' + y0 + ' ' + x0 + ' ' + (sy + ss).toFixed(1)
      + ' Q ' + x0 + ' ' + y0 + ' ' + (sx - ss).toFixed(1) + ' ' + y0
      + ' Q ' + x0 + ' ' + y0 + ' ' + x0 + ' ' + (sy - ss).toFixed(1) + ' Z" fill="#F0D48A" opacity="' + (0.2 + rnd() * 0.35).toFixed(2) + '"/>';
  }
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style="position:absolute;top:0;left:0;width:100%;height:100%;">' + out + '</svg>';
}

// Engraved zodiac wheel — the cover signature.
function rptWheel(size) {
  var c = size / 2;
  var rOuter = c - 2, rTick = c - 11, rGlyph = c - 32, rInner = c - 52, rHub = c - 74;
  var svg = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" xmlns="http://www.w3.org/2000/svg" style="display:block;">';
  svg += '<circle cx="' + c + '" cy="' + c + '" r="' + rOuter + '" fill="none" stroke="rgba(212,175,97,0.5)" stroke-width="1"/>';
  svg += '<circle cx="' + c + '" cy="' + c + '" r="' + (rOuter - 4) + '" fill="none" stroke="rgba(212,175,97,0.2)" stroke-width="0.6"/>';
  for (var i = 0; i < 72; i++) {
    var a = (i / 72) * Math.PI * 2;
    var lg = i % 6 === 0;
    var r2 = rTick - (lg ? 6.5 : 3);
    svg += '<line x1="' + (c + Math.cos(a) * rTick).toFixed(1) + '" y1="' + (c + Math.sin(a) * rTick).toFixed(1)
      + '" x2="' + (c + Math.cos(a) * r2).toFixed(1) + '" y2="' + (c + Math.sin(a) * r2).toFixed(1)
      + '" stroke="rgba(212,175,97,' + (lg ? '0.55' : '0.26') + ')" stroke-width="' + (lg ? '1' : '0.6') + '"/>';
  }
  ZODIAC_SYMBOLS.forEach(function(g, idx) {
    var a = (idx / 12) * Math.PI * 2 - Math.PI / 2;
    // ︎ (text-presentation selector) keeps zodiac glyphs engraved
    // monochrome instead of the colour-emoji form Android/Windows prefer.
    svg += '<text x="' + (c + Math.cos(a) * rGlyph).toFixed(1) + '" y="' + (c + Math.sin(a) * rGlyph + 4.5).toFixed(1)
      + '" text-anchor="middle" font-size="14" fill="rgba(240,212,138,0.72)">' + g + '︎</text>';
  });
  svg += '<circle cx="' + c + '" cy="' + c + '" r="' + rInner + '" fill="none" stroke="rgba(212,175,97,0.34)" stroke-width="0.7" stroke-dasharray="1 4"/>';
  svg += '<circle cx="' + c + '" cy="' + c + '" r="' + rHub + '" fill="none" stroke="rgba(212,175,97,0.18)" stroke-width="0.6"/>';
  for (var k = 0; k < 12; k++) {
    var ak = (k / 12) * Math.PI * 2 + Math.PI / 12;
    svg += '<line x1="' + (c + Math.cos(ak) * rHub).toFixed(1) + '" y1="' + (c + Math.sin(ak) * rHub).toFixed(1)
      + '" x2="' + (c + Math.cos(ak) * rInner).toFixed(1) + '" y2="' + (c + Math.sin(ak) * rInner).toFixed(1)
      + '" stroke="rgba(212,175,97,0.14)" stroke-width="0.6"/>';
  }
  return svg + '</svg>';
}

// Circular score gauge on the night ground — serif numeral, hairline track.
function rptArc(score, size, color, label) {
  if (score == null || isNaN(score)) return '';
  var pct = Math.min(100, Math.max(0, Math.round(score)));
  var r = (size - 10) / 2;
  var circ = 2 * Math.PI * r;
  var dash = (pct / 100) * circ;
  var c = size / 2;
  var numSize = Math.round(size * 0.3);
  var numY = label ? c + numSize * 0.18 : c + numSize * 0.34;
  var svg = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;">'
    + '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="rgba(240,233,216,0.1)" stroke-width="4"/>'
    + '<circle cx="' + c + '" cy="' + c + '" r="' + (r - 6.5) + '" fill="none" stroke="rgba(212,175,97,0.16)" stroke-width="0.7" stroke-dasharray="1 3.5"/>'
    + '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + dash.toFixed(1) + ' ' + (circ - dash).toFixed(1) + '" transform="rotate(-90 ' + c + ' ' + c + ')"/>'
    + '<text x="' + c + '" y="' + numY.toFixed(1) + '" text-anchor="middle" font-family="Georgia,Noto Serif,serif" font-size="' + numSize + '" font-weight="600" fill="#F4E9CF">' + pct + '</text>';
  if (label) {
    svg += '<text x="' + c + '" y="' + (numY + numSize * 0.62).toFixed(1) + '" text-anchor="middle" font-size="' + Math.max(6.5, Math.round(size * 0.052)) + '" letter-spacing="1.6" fill="rgba(212,175,97,0.8)">' + label + '</text>';
  }
  return svg + '</svg>';
}

// Sri Lankan kendara on the night ground. variant: 'd1' gold | 'd9' rose.
function rptKendara(rashiChart, lagnaRashiId, lang, size, variant) {
  if (!rashiChart || !lagnaRashiId) return '';
  var S = size || 216;
  var C = S / 3;
  var isSi = lang === 'si';
  var v = variant === 'd9'
    ? { line: 'rgba(232,163,191,', bg1: '#20112E', bg2: '#150A20', id: 'kd9' }
    : { line: 'rgba(212,175,97,', bg1: '#1A1142', bg2: '#110B2A', id: 'kd1' };

  var rashiData = {};
  for (var i = 1; i <= 12; i++) rashiData[i] = { planets: [], hasLagna: i === lagnaRashiId };
  if (Array.isArray(rashiChart)) {
    rashiChart.forEach(function(entry) {
      var rid = entry.rashiId;
      if (rid && rashiData[rid] && entry.planets) {
        entry.planets.forEach(function(p) {
          var pName = typeof p === 'string' ? p : (p.name || '');
          if (pName === 'Lagna' || pName === 'Ascendant') rashiData[rid].hasLagna = true;
          else if (pName) rashiData[rid].planets.push(typeof p === 'string' ? { name: p } : p);
        });
      }
    });
  }
  var rashiForHouse = function(h) { return ((lagnaRashiId - 1 + (h - 1)) % 12) + 1; };

  function planetText(houseNum, x, y) {
    var d = rashiData[rashiForHouse(houseNum)];
    if (!d || d.planets.length === 0) return '';
    var lines = '';
    d.planets.forEach(function(p, idx) {
      var pName = p.name || '';
      var lbl = isSi ? (PLANET_SI[pName] || pName.substring(0, 2)) : (PLANET_SHORT[pName] || pName.substring(0, 2));
      var col = RPT_PLANET_DARK[pName] || '#C9C2B2';
      var deg = p.degree != null ? '<tspan font-size="6" opacity="0.62"> ' + Math.floor(p.degree) + '°</tspan>' : '';
      lines += '<text x="' + x + '" y="' + (y + idx * 11.5) + '" fill="' + col + '" font-size="8.4" font-weight="700" text-anchor="middle">' + lbl + deg + '</text>';
    });
    return lines;
  }
  function hLabel(num, x, y) {
    return '<text x="' + x + '" y="' + y + '" fill="' + v.line + '0.42)" font-size="6.4" font-family="Georgia,Noto Serif,serif" text-anchor="middle">' + num + '</text>';
  }
  function lagnaBadge(x, y) {
    return '<circle cx="' + x + '" cy="' + (y - 3) + '" r="8" fill="rgba(212,175,97,0.13)" stroke="rgba(212,175,97,0.55)" stroke-width="0.8"/>'
      + '<text x="' + x + '" y="' + y + '" fill="#F0D48A" font-size="8.6" font-weight="900" text-anchor="middle">ල</text>';
  }

  var svg = '<svg width="' + S + '" height="' + S + '" viewBox="0 0 ' + S + ' ' + S + '" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;display:block;margin:0 auto;">'
    + '<defs><radialGradient id="' + v.id + '" cx="50%" cy="42%" r="75%"><stop offset="0%" stop-color="' + v.bg1 + '"/><stop offset="100%" stop-color="' + v.bg2 + '"/></radialGradient></defs>'
    + '<rect width="' + S + '" height="' + S + '" fill="url(#' + v.id + ')" rx="7"/>'
    + '<rect x="0.5" y="0.5" width="' + (S - 1) + '" height="' + (S - 1) + '" fill="none" stroke="' + v.line + '0.55)" stroke-width="1" rx="7"/>'
    + '<rect x="4" y="4" width="' + (S - 8) + '" height="' + (S - 8) + '" fill="none" stroke="' + v.line + '0.16)" stroke-width="0.7" rx="5"/>'
    + '<line x1="' + C + '" y1="0" x2="' + C + '" y2="' + S + '" stroke="' + v.line + '0.3)" stroke-width="0.8"/>'
    + '<line x1="' + (2 * C) + '" y1="0" x2="' + (2 * C) + '" y2="' + S + '" stroke="' + v.line + '0.3)" stroke-width="0.8"/>'
    + '<line x1="0" y1="' + C + '" x2="' + S + '" y2="' + C + '" stroke="' + v.line + '0.3)" stroke-width="0.8"/>'
    + '<line x1="0" y1="' + (2 * C) + '" x2="' + S + '" y2="' + (2 * C) + '" stroke="' + v.line + '0.3)" stroke-width="0.8"/>'
    + '<line x1="0" y1="' + C + '" x2="' + C + '" y2="0" stroke="' + v.line + '0.2)" stroke-width="0.7"/>'
    + '<line x1="' + (2 * C) + '" y1="0" x2="' + (3 * C) + '" y2="' + C + '" stroke="' + v.line + '0.2)" stroke-width="0.7"/>'
    + '<line x1="0" y1="' + (2 * C) + '" x2="' + C + '" y2="' + (3 * C) + '" stroke="' + v.line + '0.2)" stroke-width="0.7"/>'
    + '<line x1="' + (2 * C) + '" y1="' + (3 * C) + '" x2="' + (3 * C) + '" y2="' + (2 * C) + '" stroke="' + v.line + '0.2)" stroke-width="0.7"/>'
    + '<circle cx="' + (1.5 * C) + '" cy="' + (1.5 * C) + '" r="' + (C * 0.38) + '" fill="none" stroke="' + v.line + '0.22)" stroke-width="0.7"/>'
    + '<circle cx="' + (1.5 * C) + '" cy="' + (1.5 * C) + '" r="' + (C * 0.28) + '" fill="none" stroke="' + v.line + '0.12)" stroke-width="0.6" stroke-dasharray="1 3"/>'
    + '<text x="' + (1.5 * C) + '" y="' + (1.5 * C + 4) + '" text-anchor="middle" font-size="11" fill="' + v.line + '0.5)">✦</text>';

  svg += planetText(1, C * 1.5, C * 0.38) + hLabel(1, C * 1.5, C * 0.17) + lagnaBadge(C * 1.5, C * 0.93);
  svg += planetText(2, C * 0.32, C * 0.3) + hLabel(2, C * 0.14, C * 0.17);
  svg += planetText(3, C * 0.68, C * 0.76) + hLabel(3, C * 0.86, C * 0.92);
  svg += planetText(4, C * 0.5, C * 1.38) + hLabel(4, C * 0.5, C * 1.16);
  svg += planetText(5, C * 0.32, C * 2.28) + hLabel(5, C * 0.14, C * 2.16);
  svg += planetText(6, C * 0.68, C * 2.76) + hLabel(6, C * 0.86, C * 2.92);
  svg += planetText(7, C * 1.5, C * 2.4) + hLabel(7, C * 1.5, C * 2.18);
  svg += planetText(8, C * 2.68, C * 2.76) + hLabel(8, C * 2.86, C * 2.92);
  svg += planetText(9, C * 2.32, C * 2.28) + hLabel(9, C * 2.14, C * 2.16);
  svg += planetText(10, C * 2.5, C * 1.38) + hLabel(10, C * 2.5, C * 1.16);
  svg += planetText(11, C * 2.32, C * 0.76) + hLabel(11, C * 2.14, C * 0.92);
  svg += planetText(12, C * 2.68, C * 0.3) + hLabel(12, C * 2.86, C * 0.17);

  return svg + '</svg>';
}

// Twelve-month convergence skyline — one bar per month, coloured by its
// strongest life domain; small ring above a bar marks an eclipse month.
function rptSkyline(months, isSi) {
  if (!Array.isArray(months) || months.length === 0) return '';
  var W = 488, H = 172, baseY = 134;
  var n = Math.min(12, months.length);
  var step = (W - 14) / n;
  var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;">'
    + '<line x1="5" y1="' + baseY + '" x2="' + (W - 5) + '" y2="' + baseY + '" stroke="rgba(212,175,97,0.3)" stroke-width="0.8"/>';
  for (var i = 0; i < n; i++) {
    var m = months[i] || {};
    var best = null, scores = m.scores || {};
    Object.keys(scores).forEach(function(d) { if (best == null || scores[d] > scores[best]) best = d; });
    var meta = RPT_DOMAINS[best] || { color: '#F0D48A' };
    var score = best != null ? Math.round(scores[best]) : 50;
    var h = Math.max(16, Math.min(96, 24 + ((score - 30) / 68) * 72));
    var cx = 7 + step * i + step / 2;
    var x = cx - 9, y = baseY - h;
    svg += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="18" height="' + h.toFixed(1) + '" rx="3" fill="' + meta.color + '" opacity="0.88"/>'
      + '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="18" height="' + Math.min(5, h).toFixed(1) + '" rx="2.5" fill="rgba(255,255,255,0.18)"/>'
      + '<text x="' + cx.toFixed(1) + '" y="' + (y - 6).toFixed(1) + '" text-anchor="middle" font-family="Georgia,Noto Serif,serif" font-size="8.4" fill="rgba(240,233,216,0.78)">' + score + '</text>'
      + '<text x="' + cx.toFixed(1) + '" y="' + (baseY + 14) + '" text-anchor="middle" font-size="7' + '" fill="rgba(240,233,216,0.42)">' + escapeHTML(String(m.label || m.month || '').split(' ')[0]) + '</text>';
    if (m.eclipses && m.eclipses.length) {
      svg += '<circle cx="' + cx.toFixed(1) + '" cy="' + (y - 17).toFixed(1) + '" r="2.8" fill="none" stroke="#F0D48A" stroke-width="0.9"/>';
    }
  }
  svg += '<text x="' + (W - 5) + '" y="' + (H - 3) + '" text-anchor="end" font-size="6.6" letter-spacing="1.2" fill="rgba(240,233,216,0.3)">' + (isSi ? '◌ = ග්‍රහණ මාසය' : '◌ = ECLIPSE MONTH') + '</text>';
  return svg + '</svg>';
}

// ════════════════════════════════════════════════
// CELESTIAL ALMANAC — print stylesheet
// ════════════════════════════════════════════════
function reportPrintCSS(isSi) {
  var serif = 'Georgia,"Noto Serif","Times New Roman",serif';
  var sinh = '"Noto Sans Sinhala","Iskoola Pota",-apple-system,Roboto,sans-serif';
  var disp = isSi ? sinh : serif;
  var lbl = isSi ? sinh : serif;
  var bodyF = isSi ? sinh : serif;
  var up = isSi ? '' : 'text-transform:uppercase;';
  // Any letter-spacing on Sinhala splits ZWJ conjuncts (rakaransaya,
  // yansaya) in Blink, so tracked labels are a Latin-only luxury.
  var trk = function(en) { return 'letter-spacing:' + (isSi ? '0' : en) + ';'; };

  return ''
    + ':root{--night:#0B0716;--cream:#F4E9CF;--gold:#D4AF61;--gold2:#F0D48A;--hair:rgba(212,175,97,.3);--hair2:rgba(212,175,97,.16);--bodyc:rgba(240,233,216,.92);--faint:rgba(240,233,216,.6);--ghost:rgba(240,233,216,.38);--veil:rgba(244,232,203,.045);}'
    + '@page{margin:0;size:A4;}*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}'
    + 'html,body{min-height:100%;background:#0B0716;}'
    + 'body{font-family:' + bodyF + ';font-size:' + (isSi ? '12.2px' : '12.6px') + ';line-height:' + (isSi ? '1.95' : '1.78') + ';color:var(--bodyc);}'
    // Night sky — fixed layers repeat on every printed page
    + '.bg{position:fixed;top:0;left:0;right:0;bottom:0;z-index:-3;background:linear-gradient(168deg,#0D081C 0%,#0B0716 34%,#0E0A20 62%,#090612 100%);}'
    + '.bg::before{content:"";position:absolute;top:0;left:0;right:0;bottom:0;background:radial-gradient(ellipse 420px 300px at 82% 10%,rgba(88,63,164,.17),transparent 68%),radial-gradient(ellipse 400px 300px at 10% 88%,rgba(23,94,84,.15),transparent 70%),radial-gradient(ellipse 320px 240px at 18% 16%,rgba(212,175,97,.05),transparent 70%);}'
    + '.wmk{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-32deg);font-family:' + sinh + ';font-size:94px;letter-spacing:18px;font-weight:700;color:rgba(244,233,207,.023);white-space:nowrap;z-index:-1;}'
    // Hairline frame + corner ticks + folios (hidden under cover/end via z-index)
    + '.frame{position:fixed;top:15px;left:15px;right:15px;bottom:15px;border:1px solid var(--hair2);z-index:1;}'
    + '.fc{position:fixed;width:22px;height:22px;z-index:1;}'
    + '.fc-tl{top:10px;left:10px;border-top:1px solid var(--hair);border-left:1px solid var(--hair);}'
    + '.fc-tr{top:10px;right:10px;border-top:1px solid var(--hair);border-right:1px solid var(--hair);}'
    + '.fc-bl{bottom:10px;left:10px;border-bottom:1px solid var(--hair);border-left:1px solid var(--hair);}'
    + '.fc-br{bottom:10px;right:10px;border-bottom:1px solid var(--hair);border-right:1px solid var(--hair);}'
    + '.folio-t{position:fixed;top:0;left:0;right:0;height:40px;display:flex;align-items:center;justify-content:center;gap:12px;z-index:1;font-family:' + lbl + ';font-size:7.5px;' + trk('3.2px', '1.6px') + up + 'color:rgba(212,175,97,.66);}'
    + '.folio-t::before,.folio-t::after{content:"";width:58px;height:1px;background:var(--hair2);}'
    + '.folio-b{position:fixed;bottom:0;left:0;right:0;height:36px;display:flex;align-items:center;justify-content:center;gap:9px;z-index:1;font-family:' + lbl + ';font-size:6.8px;letter-spacing:2.2px;text-transform:uppercase;color:rgba(240,233,216,.42);}'
    + '.folio-b b{color:rgba(212,175,97,.6);font-weight:400;}'
    + '.fb-name{letter-spacing:0;}'
    // Page scaffold
    + '.pg{position:relative;padding:74px 52px 66px;page-break-after:always;}'
    + '.eyebrow{font-family:' + lbl + ';font-size:8.5px;' + trk('3.4px', '1.4px') + up + 'color:var(--gold);margin-bottom:10px;}'
    + '.pg-title{font-family:' + disp + ';font-size:' + (isSi ? '24px' : '27px') + ';font-weight:' + (isSi ? '800' : '700') + ';color:var(--cream);line-height:1.18;margin-bottom:6px;text-wrap:balance;}'
    + '.pg-sub{font-size:10.5px;color:var(--faint);margin-bottom:18px;line-height:1.65;max-width:420px;}'
    + '.rule{display:flex;align-items:center;gap:10px;margin:12px 0 18px;}'
    + '.rule::before{content:"";flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--hair));}'
    + '.rule::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,var(--hair),transparent);}'
    + '.rule em{font-style:normal;color:var(--gold);font-size:8px;line-height:1;}'
    // ── Cover ──
    + '.cov{position:relative;z-index:2;min-height:100vh;background:linear-gradient(172deg,#0F0A20 0%,#0B0716 42%,#0D081A 78%,#080510 100%);overflow:hidden;page-break-after:always;display:flex;flex-direction:column;align-items:center;text-align:center;padding:52px 44px 46px;}'
    + '.cov::before{content:"";position:absolute;top:0;left:0;right:0;bottom:0;background:radial-gradient(ellipse 480px 360px at 50% 28%,rgba(88,63,164,.24),transparent 68%),radial-gradient(ellipse 440px 320px at 50% 106%,rgba(23,94,84,.17),transparent 70%);}'
    + '.cov>*{position:relative;}'
    // frame declared AFTER .cov>* so its absolute positioning wins the cascade
    + '.cov-frame{position:absolute;top:18px;left:18px;right:18px;bottom:18px;border:1px solid rgba(212,175,97,.46);}'
    + '.cov-frame::before{content:"";position:absolute;top:5px;left:5px;right:5px;bottom:5px;border:1px solid rgba(212,175,97,.18);}'
    + '.cov-brand{font-family:' + sinh + ';font-size:17.5px;color:var(--gold2);font-weight:700;margin-top:12px;}'
    + '.cov-est{font-family:' + lbl + ';font-size:6.8px;' + trk('4px', '2px') + up + 'color:rgba(212,175,97,.6);margin-top:8px;}'
    + '.cov-wheelwrap{position:relative;width:346px;height:346px;margin:22px auto 20px;}'
    + '.cov-medal{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:82px;height:82px;border-radius:50%;border:1px solid rgba(212,175,97,.65);box-shadow:0 0 0 5px rgba(212,175,97,.08),0 0 46px rgba(212,175,97,.18);overflow:hidden;background:#0B0716;display:flex;align-items:center;justify-content:center;}'
    + '.logo-bg{position:absolute;top:0;left:0;right:0;bottom:0;border-radius:50%;background-size:cover;background-position:center;background-repeat:no-repeat;background-color:#0B0716;}'
    + '.cov-medal span{font-size:30px;color:var(--gold2);}'
    + '.cov-title{font-family:' + disp + ';font-size:' + (isSi ? '29px' : '33px') + ';font-weight:' + (isSi ? '800' : '700') + ';color:var(--cream);line-height:1.16;letter-spacing:' + (isSi ? '0' : '.3px') + ';text-wrap:balance;}'
    + '.cov-sub{font-family:' + lbl + ';font-size:9.5px;' + trk('2.8px', '.4px') + up + 'color:var(--faint);margin-top:9px;}'
    + '.cov-kick{font-family:' + lbl + ';font-size:7px;' + trk('3.2px', '1.4px') + up + 'color:rgba(212,175,97,.72);margin-top:20px;}'
    + '.cov-name{font-family:' + disp + ';font-size:23px;color:var(--gold2);font-weight:' + (isSi ? '800' : '700') + ';margin-top:5px;letter-spacing:.4px;}'
    + '.rec{margin:14px auto 0;width:302px;text-align:left;border:1px solid var(--hair2);background:rgba(9,6,18,.55);padding:13px 17px;}'
    + '.rec .rr{display:flex;align-items:baseline;gap:8px;padding:4.5px 0;}'
    + '.rec .rl{color:rgba(212,175,97,.78);font-family:' + lbl + ';' + trk('1.6px', '.3px') + up + 'font-size:7.4px;white-space:nowrap;}'
    + '.rec .rd{flex:1;border-bottom:1px dotted rgba(240,233,216,.22);transform:translateY(-2px);min-width:14px;}'
    + '.rec .rv{color:var(--bodyc);font-weight:600;font-size:9.6px;text-align:right;max-width:186px;line-height:1.5;}'
    + '.cov-foot{position:absolute;bottom:30px;left:0;right:0;font-family:' + lbl + ';font-size:6.6px;' + trk('3px', '1.2px') + up + 'color:rgba(240,233,216,.36);}'
    // ── Contents ──
    + '.toc-list{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:7px 14px;}'
    + '.toc-it{display:flex;align-items:center;gap:9px;padding:8px 11px;border:1px solid rgba(240,233,216,.07);background:var(--veil);page-break-inside:avoid;}'
    + '.toc-no{font-family:' + serif + ';font-size:11.5px;color:var(--gold);min-width:19px;text-align:right;}'
    + '.toc-gem{width:5px;height:5px;transform:rotate(45deg);flex:none;}'
    + '.toc-lb{font-size:' + (isSi ? '9.8px' : '10.2px') + ';color:var(--bodyc);font-weight:600;line-height:1.35;}'
    // ── Celestial identity ──
    + '.meds{display:flex;gap:11px;margin:2px 0 16px;}'
    + '.med{flex:1;text-align:center;padding:15px 8px 13px;border:1px solid var(--hair2);background:var(--veil);position:relative;page-break-inside:avoid;}'
    + '.med::before{content:"";position:absolute;top:4px;left:4px;right:4px;bottom:4px;border:1px solid rgba(212,175,97,.08);}'
    + '.med-g{width:42px;height:42px;margin:0 auto 8px;border-radius:50%;border:1px solid rgba(212,175,97,.5);display:flex;align-items:center;justify-content:center;font-size:18px;color:var(--gold2);box-shadow:0 0 0 4px rgba(212,175,97,.06);position:relative;}'
    + '.cres{width:15px;height:15px;border-radius:50%;box-shadow:inset 5px -1px 0 0 var(--gold2);transform:rotate(-20deg);}'
    + '.med-l{font-family:' + lbl + ';font-size:6.8px;' + trk('2.4px', '.8px') + up + 'color:rgba(212,175,97,.75);margin-bottom:4px;}'
    + '.med-v{font-family:' + disp + ';font-size:12.5px;font-weight:700;color:var(--cream);line-height:1.35;}'
    + '.idn-rec{width:100%;margin:0 0 16px;}'
    + '.charts{display:flex;gap:13px;justify-content:center;margin:0 0 11px;page-break-inside:avoid;}'
    + '.chart-card{flex:1;max-width:238px;text-align:center;padding:12px 10px 10px;border:1px solid var(--hair2);background:var(--veil);page-break-inside:avoid;}'
    + '.chart-card.d9{border-color:rgba(232,163,191,.24);}'
    + '.cc-t{font-family:' + lbl + ';font-size:8px;' + trk('2.2px', '.8px') + up + 'color:var(--gold);margin-bottom:3px;}'
    + '.d9 .cc-t{color:#E8A3BF;}'
    + '.cc-s{font-size:7.8px;color:var(--ghost);margin-bottom:8px;line-height:1.55;}'
    + '.keys{margin-top:11px;padding:9px 13px;border:1px solid rgba(240,233,216,.06);background:rgba(9,6,18,.42);text-align:center;font-size:8px;color:var(--faint);line-height:2;page-break-inside:avoid;}'
    + '.keys b{color:rgba(212,175,97,.85);font-weight:600;letter-spacing:1.6px;text-transform:uppercase;font-size:6.8px;margin-right:7px;font-family:' + lbl + ';}'
    + '.keys span{white-space:nowrap;margin:0 4px;}'
    // ── Life balance ──
    + '.bal-hero{text-align:center;padding:20px 16px 17px;border:1px solid var(--hair2);background:linear-gradient(180deg,rgba(212,175,97,.055),rgba(212,175,97,.012));margin-bottom:13px;page-break-inside:avoid;position:relative;}'
    + '.bal-hero::before{content:"";position:absolute;top:4px;left:4px;right:4px;bottom:4px;border:1px solid rgba(212,175,97,.07);}'
    + '.bal-verdict{font-family:' + disp + ';font-size:15px;font-weight:700;color:var(--cream);margin-top:9px;}'
    + '.bal-count{font-family:' + lbl + ';font-size:7.6px;color:var(--ghost);' + trk('2px', '.5px') + up + 'margin-top:3px;}'
    + '.bal-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;}'
    + '.bal-cell{padding:12px 12px 10px;border:1px solid rgba(240,233,216,.07);background:var(--veil);page-break-inside:avoid;}'
    + '.bc-name{font-family:' + lbl + ';font-size:' + (isSi ? '8.4px' : '7.4px') + ';' + trk('1.8px', '.3px') + up + 'color:var(--faint);min-height:23px;line-height:1.5;margin-bottom:6px;}'
    + '.bc-score{font-family:' + serif + ';font-size:25px;color:var(--cream);line-height:1;}'
    + '.bc-score i{font-style:normal;font-size:9px;color:var(--ghost);margin-left:2px;}'
    + '.bc-bar{height:3px;background:rgba(240,233,216,.09);margin:8px 0 6px;}'
    + '.bc-fill{height:3px;}'
    + '.bc-tier{font-size:7.8px;font-weight:700;' + trk('1.4px', '.3px') + up + 'font-family:' + lbl + ';}'
    // ── Next 12 months ──
    + '.sky-plate{border:1px solid var(--hair2);background:var(--veil);padding:15px 13px 8px;page-break-inside:avoid;margin-bottom:13px;}'
    + '.wins-cap{font-family:' + lbl + ';font-size:8px;' + trk('2.6px', '1px') + up + 'color:var(--gold);margin:15px 0 8px;}'
    + '.wins{display:flex;flex-direction:column;gap:7px;}'
    + '.win{display:flex;align-items:center;gap:11px;padding:9px 13px;border:1px solid rgba(240,233,216,.08);background:rgba(9,6,18,.45);page-break-inside:avoid;}'
    + '.win.caution{border-color:rgba(232,131,110,.38);background:rgba(232,131,110,.055);}'
    + '.win-gem{width:7px;height:7px;transform:rotate(45deg);flex:none;}'
    + '.win-t{font-size:10.4px;font-weight:700;color:var(--cream);line-height:1.45;}'
    + '.win-s{font-size:8.4px;color:var(--ghost);margin-top:1px;}'
    + '.legend{display:flex;flex-wrap:wrap;gap:5px 15px;justify-content:center;margin-top:12px;font-size:8px;color:var(--faint);}'
    + '.legend span{display:inline-flex;align-items:center;gap:5px;}'
    + '.legend b{width:6px;height:6px;border-radius:50%;display:inline-block;}'
    // ── Chapters ──
    + '.ch-head{position:relative;margin-bottom:15px;page-break-inside:avoid;page-break-after:avoid;}'
    + '.ch-ghost{position:absolute;top:-30px;right:-6px;font-family:' + serif + ';font-size:104px;line-height:1;color:rgba(244,233,207,.05);font-weight:700;letter-spacing:-2px;}'
    + '.ch-title{font-family:' + disp + ';font-size:' + (isSi ? '20px' : '23px') + ';font-weight:' + (isSi ? '800' : '700') + ';color:var(--cream);line-height:1.22;max-width:400px;text-wrap:balance;}'
    + '.ch-meta{display:flex;align-items:center;gap:14px;margin-top:13px;padding:9px 13px;border:1px solid var(--hair2);background:var(--veil);page-break-inside:avoid;page-break-after:avoid;}'
    + '.chm-mid{flex:1;}'
    + '.chm-lbl{font-family:' + lbl + ';font-size:6.8px;' + trk('2.2px', '.8px') + up + 'color:var(--ghost);margin-bottom:5px;}'
    + '.chm-bar{height:3px;background:rgba(240,233,216,.09);}'
    + '.chm-fill{height:3px;}'
    + '.chm-tier{font-family:' + lbl + ';font-size:8.6px;font-weight:700;white-space:nowrap;' + trk('1.4px', '.3px') + up + '}'
    // Prose
    + '.prose{max-width:100%;}'
    + '.body-p{margin:0 0 10px;orphans:3;widows:3;}'
    + '.md-h2{font-family:' + lbl + ';font-size:' + (isSi ? '11.6px' : '9.8px') + ';' + trk('2.6px', '.6px') + up + 'color:var(--gold);margin:19px 0 9px;display:flex;align-items:center;gap:10px;font-weight:700;page-break-after:avoid;}'
    + '.md-h2::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,var(--hair2),transparent);}'
    + '.md-h3{font-family:' + disp + ';font-size:13.4px;font-weight:700;color:var(--cream);margin:15px 0 7px;page-break-after:avoid;}'
    + '.md-bullet{display:flex;gap:9px;margin:7px 0;padding:8px 12px;background:rgba(244,233,207,.032);border-left:2px solid rgba(212,175,97,.4);page-break-inside:avoid;}'
    + '.md-bullet span{color:var(--gold);font-size:9px;}'
    + '.prose blockquote{margin:13px 14px;padding:11px 16px;position:relative;color:rgba(240,233,216,.82);font-style:italic;border-left:2px solid var(--gold);background:rgba(212,175,97,.05);page-break-inside:avoid;}'
    + '.prose strong{color:var(--cream);font-weight:700;}'
    + '.prose em{color:var(--gold2);font-weight:600;}'
    + (isSi ? '' : '.ch-body .prose>p.body-p:first-child::first-letter{font-family:' + serif + ';float:left;font-size:35px;line-height:.86;padding:3px 8px 0 0;color:var(--gold2);}')
    // ── Colophon ──
    + '.end{position:relative;z-index:2;min-height:100vh;background:linear-gradient(188deg,#0E091C,#0B0716 46%,#0A0614);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:60px 50px;overflow:hidden;page-break-before:always;}'
    + '.end::before{content:"";position:absolute;top:0;left:0;right:0;bottom:0;background:radial-gradient(ellipse 420px 320px at 50% 40%,rgba(88,63,164,.18),transparent 70%);}'
    + '.end>*{position:relative;}'
    // frame declared AFTER .end>* so its absolute positioning wins the cascade
    + '.end-frame{position:absolute;top:18px;left:18px;right:18px;bottom:18px;border:1px solid rgba(212,175,97,.42);}'
    + '.end-medal{position:relative;width:72px;height:72px;border-radius:50%;border:1px solid rgba(212,175,97,.6);box-shadow:0 0 0 5px rgba(212,175,97,.07),0 0 40px rgba(212,175,97,.15);overflow:hidden;background:#0B0716;display:flex;align-items:center;justify-content:center;}'
    + '.end-medal span{font-size:26px;color:var(--gold2);}'
    + '.end-brand{font-family:' + sinh + ';font-size:15.5px;color:var(--gold2);font-weight:700;margin-top:15px;}'
    + '.end-motto{font-family:' + disp + ';font-size:14.5px;color:var(--bodyc);margin-top:13px;' + (isSi ? '' : 'font-style:italic;') + '}'
    + '.end-rule{display:flex;align-items:center;gap:10px;width:210px;margin:18px 0 0;}'
    + '.end-rule::before{content:"";flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--hair));}'
    + '.end-rule::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,var(--hair),transparent);}'
    + '.end-rule em{font-style:normal;color:var(--gold);font-size:8px;}'
    + '.end-feats{display:flex;gap:19px;margin-top:19px;font-family:' + lbl + ';font-size:8.4px;' + trk('2px', '.4px') + up + 'color:var(--faint);}'
    + '.end-feats i{font-style:normal;color:rgba(212,175,97,.55);}'
    + '.end-cta{margin-top:23px;padding:9px 27px;border:1px solid rgba(212,175,97,.55);color:var(--gold2);font-family:' + lbl + ';font-size:8.4px;' + trk('2.6px', '.6px') + up + '}'
    + '.end-url{margin-top:13px;font-family:' + lbl + ';font-size:7.6px;letter-spacing:3px;color:var(--ghost);text-transform:uppercase;}'
    + '.end-prep{margin-top:25px;font-size:8.6px;color:var(--faint);}'
    + '.end-ref{margin-top:4px;font-family:' + lbl + ';font-size:6.8px;letter-spacing:2.2px;color:rgba(212,175,97,.5);text-transform:uppercase;}'
    + '.end-disc{margin-top:17px;max-width:330px;font-size:6.8px;line-height:1.85;color:rgba(240,233,216,.32);}'
    // Shared note plates, graha table, tier legend, cover motto
    + '.cov-motto{font-family:' + disp + ';font-size:10.5px;color:var(--faint);margin-top:18px;' + (isSi ? '' : 'font-style:italic;') + '}'
    + '.note{border:1px solid var(--hair2);background:var(--veil);padding:12px 16px;page-break-inside:avoid;margin-top:14px;}'
    + '.note-cap{font-family:' + lbl + ';font-size:8px;' + trk('2.6px') + up + 'color:var(--gold);margin-bottom:7px;}'
    + '.nr{display:flex;gap:9px;padding:4px 0;font-size:9.6px;color:var(--faint);line-height:1.7;}'
    + '.nr b{color:var(--gold);font-weight:400;min-width:12px;font-family:' + serif + ';}'
    + '.graha-grid{display:grid;grid-template-columns:1fr 1fr;gap:3px 26px;}'
    + '.gr{display:flex;align-items:baseline;justify-content:space-between;gap:8px;font-size:9.5px;padding:4px 0;border-bottom:1px dotted rgba(240,233,216,.13);}'
    + '.gr .gp{display:inline-flex;align-items:center;gap:7px;color:var(--bodyc);font-weight:600;}'
    + '.gr .gp b{width:6px;height:6px;border-radius:50%;}'
    + '.gr .gv{color:var(--faint);}'
    + '.tierleg{display:flex;gap:8px;margin-top:12px;}'
    + '.tl{flex:1;text-align:center;padding:8px 4px;border:1px solid rgba(240,233,216,.07);background:var(--veil);page-break-inside:avoid;}'
    + '.tl b{display:block;width:18px;height:3px;margin:0 auto 6px;}'
    + '.tl .t1{font-size:8.4px;font-weight:700;}'
    + '.tl .t2{font-family:' + lbl + ';font-size:6.4px;' + trk('1px') + up + 'color:var(--ghost);margin-top:2px;}'
    + '@media print{.pg{page-break-after:always;}.cov{page-break-after:always;}.end{page-break-before:always;}.charts,.chart-card,.med,.bal-cell,.win,.sky-plate,.ch-head,.ch-meta,.md-bullet,.toc-it,.note,.tl{page-break-inside:avoid;}}';
}

// ════════════════════════════════════════════════
// SVG SRI LANKAN RASHI CHART
// ════════════════════════════════════════════════
function svgSriLankanChart(rashiChart, lagnaRashiId, lang, size) {
  if (!rashiChart || !lagnaRashiId) return '';
  var S = size || 300;
  var C = S / 3;
  var isSi = lang === 'si';

  var rashiData = {};
  for (var i = 1; i <= 12; i++) rashiData[i] = { planets: [], hasLagna: i === lagnaRashiId };
  if (Array.isArray(rashiChart)) {
    rashiChart.forEach(function(entry) {
      var rid = entry.rashiId;
      if (rid && rashiData[rid] && entry.planets) {
        entry.planets.forEach(function(p) {
          var pName = typeof p === 'string' ? p : (p.name || '');
          if (pName === 'Lagna' || pName === 'Ascendant') rashiData[rid].hasLagna = true;
          else rashiData[rid].planets.push(typeof p === 'string' ? { name: p } : p);
        });
      }
    });
  }

  var rashiForHouse = function(h) { return ((lagnaRashiId - 1 + (h - 1)) % 12) + 1; };

  function planetText(houseNum, x, y) {
    var rid = rashiForHouse(houseNum);
    var d = rashiData[rid];
    if (!d || d.planets.length === 0) return '';
    var lines = '';
    d.planets.forEach(function(p, idx) {
      var pName = p.name || '';
      var lbl = isSi ? (PLANET_SI[pName] || pName.substring(0,2)) : (PLANET_SHORT[pName] || pName.substring(0,2));
      var col = PLANET_COLORS[pName] || '#666';
      var deg = p.degree != null ? ' '+Math.floor(p.degree)+'°' : '';
      lines += '<text x="'+x+'" y="'+(y + idx*13)+'" fill="'+col+'" font-size="9" font-weight="700" text-anchor="middle">'+lbl+deg+'</text>';
    });
    return lines;
  }

  function hLabel(num, x, y) {
    return '<text x="'+x+'" y="'+y+'" fill="rgba(124,58,237,0.3)" font-size="8" font-weight="700" text-anchor="middle">'+num+'</text>';
  }

  function lagnaM(houseNum, x, y) {
    var rid = rashiForHouse(houseNum);
    if (!rashiData[rid].hasLagna) return '';
    return '<text x="'+x+'" y="'+y+'" fill="#EAB308" font-size="10" font-weight="900" text-anchor="middle">ල</text>';
  }

  var svg = '<svg width="'+S+'" height="'+S+'" viewBox="0 0 '+S+' '+S+'" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;display:block;margin:0 auto;">'
    +'<rect width="'+S+'" height="'+S+'" fill="#fefce8" rx="8"/>'
    +'<rect x="0.5" y="0.5" width="'+(S-1)+'" height="'+(S-1)+'" fill="none" stroke="rgba(124,58,237,0.5)" stroke-width="1.5" rx="8"/>'
    +'<line x1="'+C+'" y1="0" x2="'+C+'" y2="'+S+'" stroke="rgba(124,58,237,0.4)" stroke-width="1"/>'
    +'<line x1="'+(2*C)+'" y1="0" x2="'+(2*C)+'" y2="'+S+'" stroke="rgba(124,58,237,0.4)" stroke-width="1"/>'
    +'<line x1="0" y1="'+C+'" x2="'+S+'" y2="'+C+'" stroke="rgba(124,58,237,0.4)" stroke-width="1"/>'
    +'<line x1="0" y1="'+(2*C)+'" x2="'+S+'" y2="'+(2*C)+'" stroke="rgba(124,58,237,0.4)" stroke-width="1"/>'
    // Corner diagonals
    +'<line x1="0" y1="'+C+'" x2="'+C+'" y2="0" stroke="rgba(124,58,237,0.3)" stroke-width="0.8"/>'
    +'<line x1="'+(2*C)+'" y1="0" x2="'+(3*C)+'" y2="'+C+'" stroke="rgba(124,58,237,0.3)" stroke-width="0.8"/>'
    +'<line x1="0" y1="'+(2*C)+'" x2="'+C+'" y2="'+(3*C)+'" stroke="rgba(124,58,237,0.3)" stroke-width="0.8"/>'
    +'<line x1="'+(2*C)+'" y1="'+(3*C)+'" x2="'+(3*C)+'" y2="'+(2*C)+'" stroke="rgba(124,58,237,0.3)" stroke-width="0.8"/>';

  // House contents
  svg += planetText(1, C*1.5, C*0.35) + hLabel(1, C*1.5, C*0.15) + lagnaM(1, C*1.5, C*0.9);
  svg += planetText(2, C*0.3, C*0.25) + hLabel(2, C*0.15, C*0.15);
  svg += planetText(3, C*0.7, C*0.75) + hLabel(3, C*0.85, C*0.9);
  svg += planetText(4, C*0.5, C*1.35) + hLabel(4, C*0.5, C*1.15);
  svg += planetText(5, C*0.3, C*2.25) + hLabel(5, C*0.15, C*2.15);
  svg += planetText(6, C*0.7, C*2.75) + hLabel(6, C*0.85, C*2.9);
  svg += planetText(7, C*1.5, C*2.35) + hLabel(7, C*1.5, C*2.15);
  svg += planetText(8, C*2.7, C*2.75) + hLabel(8, C*2.85, C*2.9);
  svg += planetText(9, C*2.3, C*2.25) + hLabel(9, C*2.15, C*2.15);
  svg += planetText(10, C*2.5, C*1.35) + hLabel(10, C*2.5, C*1.15);
  svg += planetText(11, C*2.3, C*0.75) + hLabel(11, C*2.15, C*0.9);
  svg += planetText(12, C*2.7, C*0.25) + hLabel(12, C*2.85, C*0.15);

  svg += '</svg>';
  return svg;
}

// ════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════
function extractScore(sectionKey, rawData) {
  if (!rawData) return null;
  var s = null;
  switch (sectionKey) {
    case 'marriage': s = rawData.seventhHouse?.strengthScore; if (!s && rawData.marriageAfflictions) s = 100 - (rawData.marriageAfflictions.severityScore || 0); break;
    case 'career': s = rawData.tenthHouse?.strengthScore; break;
    case 'health': s = rawData.overallVitality?.strengthScore || rawData.firstHouse?.strengthScore || rawData.sixthHouse?.strengthScore; break;
    case 'financial': s = rawData.secondHouse?.strengthScore || rawData.income?.strengthScore; break;
    case 'education': s = rawData.fourthHouse?.strengthScore || rawData.fifthHouse?.strengthScore; break;
    case 'children': s = rawData.fifthHouse?.strengthScore; break;
    case 'foreignTravel': s = rawData.ninthHouse?.strengthScore || rawData.twelfthHouse?.strengthScore; break;
    case 'luck': s = rawData.ninthHouse?.strengthScore; break;
    case 'spiritual': s = rawData.twelfthHouse?.strengthScore; break;
  }
  if (s != null) return Math.min(100, Math.max(0, Math.round(s)));
  return null;
}


function escapeHTML(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inlineMarkdown(value) {
  return value
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

function markdownToHTML(text) {
  if (!text) return '';
  var safe = escapeHTML(text).replace(/\r\n/g, '\n');
  var lines = safe.split('\n');
  var html = [];
  var paragraph = [];

  function flushParagraph() {
    if (paragraph.length === 0) return;
    html.push('<p class="body-p">' + paragraph.join('<br/>') + '</p>');
    paragraph = [];
  }

  lines.forEach(function(line) {
    var trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      return;
    }

    if (trimmed.indexOf('### ') === 0) {
      flushParagraph();
      html.push('<h3 class="md-h3">' + inlineMarkdown(trimmed.slice(4)) + '</h3>');
      return;
    }

    if (trimmed.indexOf('## ') === 0) {
      flushParagraph();
      html.push('<h2 class="md-h2">' + inlineMarkdown(trimmed.slice(3)) + '</h2>');
      return;
    }

    // The whole text is escapeHTML()d above, so a markdown quote line
    // arrives here as "&gt; ..." — match both forms.
    if (trimmed.indexOf('&gt; ') === 0 || trimmed.indexOf('> ') === 0) {
      flushParagraph();
      var quoteBody = trimmed.indexOf('&gt; ') === 0 ? trimmed.slice(5) : trimmed.slice(2);
      html.push('<blockquote>' + inlineMarkdown(quoteBody) + '</blockquote>');
      return;
    }

    if (trimmed.indexOf('- ') === 0 || trimmed.indexOf('• ') === 0) {
      flushParagraph();
      html.push('<div class="md-bullet"><span>•</span><div>' + inlineMarkdown(trimmed.slice(2)) + '</div></div>');
      return;
    }

    paragraph.push(inlineMarkdown(trimmed));
  });

  flushParagraph();
  return html.join('');
}

// ═══════════════════════════════════════════════════════════════
// ███ FULL LIFE REPORT PDF — Celestial Almanac ███
// Cover (zodiac wheel) → Contents → Celestial Identity (birth
// record + medallions + dual kendara) → Life Balance dashboard →
// Next 12 Months sky calendar → numbered chapters → colophon.
// ═══════════════════════════════════════════════════════════════
function generateReportHTML(opts) {
  var isSi = opts.lang === 'si';
  var L = function(si, en) { return isSi ? si : en; };
  var pad2 = function(n) { return (n < 10 ? '0' : '') + n; };
  var sectionKeys = opts.sectionKeys || [];
  var sectionTitles = sectionKeys.map(function(key, i) {
    return (opts.sectionTitles && opts.sectionTitles[i]) || key;
  });
  var narrativeSections = (opts.aiReport && opts.aiReport.narrativeSections) || {};
  var rawSections = (opts.aiReport && opts.aiReport.rawSections) || {};
  var reportSections = (opts.report && opts.report.sections) || {};
  var bd = (opts.report && opts.report.birthData) || opts.birthData || {};
  var flatScores = (opts.aiReport && opts.aiReport.sectionScores) || null;

  var name = escapeHTML(opts.userName || L('ඔබ', 'You'));
  var refRaw = opts.aiReport && opts.aiReport.savedReportId
    ? String(opts.aiReport.savedReportId).replace(/[^A-Za-z0-9]/g, '').slice(-6).toUpperCase() : '';
  var refNo = refRaw ? 'GR-' + refRaw : '';
  var genDate;
  try {
    genDate = new Date().toLocaleDateString(isSi ? 'si-LK' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) { genDate = new Date().toLocaleDateString(); }

  function scoreFor(key) {
    if (flatScores && flatScores[key] != null && isFinite(Number(flatScores[key]))) {
      return Math.min(100, Math.max(0, Math.round(Number(flatScores[key]))));
    }
    var rd = reportSections[key] || rawSections[key] || (narrativeSections[key] && narrativeSections[key].rawData) || {};
    return extractScore(key, rd);
  }

  // ── Chart data (shapes vary: /birth-chart array vs report {houses,lagna}) ──
  var normalizedRC = null, chartLagnaId = null;
  if (opts.chartData && opts.chartData.rashiChart) {
    var rawRC = opts.chartData.rashiChart;
    normalizedRC = Array.isArray(rawRC) ? rawRC : (rawRC && Array.isArray(rawRC.houses) ? rawRC.houses : null);
    chartLagnaId = opts.chartData.lagnaRashiId
      || (opts.chartData.lagna && (opts.chartData.lagna.rashiId || opts.chartData.lagna.id))
      || (rawRC && rawRC.lagna && rawRC.lagna.rashi && rawRC.lagna.rashi.id)
      || (normalizedRC && normalizedRC[0] && normalizedRC[0].rashiId)
      || 1;
  }
  var navHouses = null, navLagnaId = null;
  if (opts.chartData && opts.chartData.navamshaChart) {
    // Same shape-tolerance as rashiChart: array (/birth-chart) or {houses,lagna}
    // (saved report). Older reports have no navamsha → the D9 card is omitted.
    var rawNav = opts.chartData.navamshaChart;
    navHouses = Array.isArray(rawNav) ? rawNav : (rawNav && Array.isArray(rawNav.houses) ? rawNav.houses : null);
    var nl = opts.chartData.navamshaLagna || (rawNav && rawNav.lagna) || null;
    navLagnaId = (nl && (nl.rashiId || (nl.rashi && nl.rashi.id) || nl.id))
      || chartLagnaId || 1;
  }

  // ── Chapters ──
  var chapters = [];
  sectionKeys.forEach(function(key, i) {
    var n = narrativeSections[key];
    if (!n || !n.narrative) return;
    chapters.push({
      key: key, no: chapters.length + 1,
      title: escapeHTML(sectionTitles[i] || n.title || key),
      narrative: n.narrative, score: scoreFor(key), accent: rptAccent(key),
    });
  });

  // background-image instead of <img> + object-fit: Android WebView's
  // print rasteriser intermittently drops or half-paints <img> inside
  // border-radius clips; a background paints in the same pass as the box.
  var logoMedal = opts.logoBase64
    ? '<div class="logo-bg" style="background-image:url(data:image/png;base64,' + opts.logoBase64 + ');"></div>'
    : '<span>✦</span>';

  // ═════ COVER ═════
  var recRow = function(label, value) {
    if (!value) return '';
    return '<div class="rr"><span class="rl">' + label + '</span><span class="rd"></span><span class="rv">' + escapeHTML(value) + '</span></div>';
  };
  var coverHTML = '<div class="cov">'
    + rptStars(595, 842, 150, 41)
    + '<div class="cov-frame"></div>'
    + '<div class="cov-brand">ග්‍රහචාර</div>'
    + '<div class="cov-est">' + L('වේදික ජ්‍යෝතිෂ ශාස්ත්‍රය', 'VEDIC ASTROLOGY OF SRI LANKA') + '</div>'
    + '<div class="cov-wheelwrap">' + rptWheel(346) + '<div class="cov-medal">' + logoMedal + '</div></div>'
    + '<div class="cov-title">' + L('සම්පූර්ණ ජීවිත වාර්තාව', 'The Complete Life Reading') + '</div>'
    + '<div class="cov-sub">' + L('ඔබේ උපන් අහසින් ලැබෙන ප්‍රායෝගික මගපෙන්වීම', 'Practical guidance drawn from your birth sky') + '</div>'
    + '<div class="cov-kick">' + L('වාර්තා හිමිකරු', 'PREPARED FOR') + '</div>'
    + '<div class="cov-name">' + name + '</div>'
    + '<div class="rec">'
    + recRow(L('උපන් ස්ථානය', 'BIRTHPLACE'), opts.birthLocation)
    + recRow(L('උපන් දිනය', 'BORN'), (opts.birthDate || '') + (opts.birthTime ? ' · ' + opts.birthTime : ''))
    + recRow(L('ලග්නය', 'LAGNA'), opts.lagnaLabel)
    + recRow(L('නැකත', 'NAKSHATRA'), opts.nakshatraLabel)
    + '</div>'
    + '<div class="cov-motto">' + L('උපන් මොහොතේ අහස — ජීවිත කාලයටම', 'The sky of your first breath, kept for a lifetime') + '</div>'
    + '<div class="cov-foot">' + L('පෞද්ගලික වාර්තාව', 'PRIVATE & PERSONAL') + ' — ' + escapeHTML(genDate) + (refNo ? ' — ' + refNo : '') + '</div>'
    + '</div>';

  // ═════ CONTENTS ═════
  var tocItems = '';
  chapters.forEach(function(ch) {
    tocItems += '<li class="toc-it"><span class="toc-no">' + pad2(ch.no) + '</span>'
      + '<span class="toc-gem" style="background:' + ch.accent + ';"></span>'
      + '<span class="toc-lb">' + ch.title + '</span></li>';
  });
  var tocHTML = chapters.length === 0 ? '' : '<div class="pg">'
    + '<div class="eyebrow">' + L('ජීවිත වාර්තාව', 'THE ALMANAC') + '</div>'
    + '<div class="pg-title">' + L('අන්තර්ගතය', 'Contents') + '</div>'
    + '<div class="pg-sub">' + L('ඔබේ උපන් අහසින් කියවීම් ' + chapters.length + 'ක්', chapters.length + ' readings from your birth sky') + '</div>'
    + '<div class="rule"><em>◆</em></div>'
    + '<ul class="toc-list">' + tocItems + '</ul>'
    + '<div class="note"><div class="note-cap">' + L('වාර්තාව කියවන ආකාරය', 'HOW TO READ THIS ALMANAC') + '</div>'
    + '<div class="nr"><b>i</b><span>' + L('සෑම පරිච්ඡේදයක්ම ඔබේ කේන්දරයේ එක් ජීවිත ක්ෂේත්‍රයක් කියවනවා.', 'Each chapter reads one life area of your birth chart.') + '</span></div>'
    + '<div class="nr"><b>ii</b><span>' + L('ලකුණු 0–100 අතරයි — ඒ ක්ෂේත්‍රයේ උපන් ශක්තියයි. වැඩි ලකුණු, වැඩි ස්වාභාවික පහසුවක්.', 'Scores run 0–100 — the born strength of that area. Higher means more natural ease.') + '</span></div>'
    + '<div class="nr"><b>iii</b><span>' + L('ඉදිරි මාස 12 පිටුවේ කාල කවුළු — ලොකු තීරණවලට හොඳම කාලයන් පෙන්වනවා.', 'The Next 12 Months page marks the best-timed windows for your bigger decisions.') + '</span></div>'
    + '</div></div>';

  // ═════ CELESTIAL IDENTITY ═════
  var moonLabel = bd.moonSign ? (isSi ? (bd.moonSign.sinhala || bd.moonSign.english) : bd.moonSign.english) : '';
  var sunLabel = bd.sunSign ? (isSi ? (bd.sunSign.sinhala || bd.sunSign.english) : bd.sunSign.english) : '';
  // ︎ suffix = text-presentation selector (blocks the colour-emoji form)
  var lagnaGlyph = chartLagnaId && ZODIAC_SYMBOLS[chartLagnaId - 1] ? ZODIAC_SYMBOLS[chartLagnaId - 1] + '︎' : '✦';
  var medsHTML = '';
  if (opts.lagnaLabel) {
    medsHTML += '<div class="med"><div class="med-g">' + lagnaGlyph + '</div><div class="med-l">' + L('ලග්නය', 'LAGNA — RISING') + '</div><div class="med-v">' + escapeHTML(opts.lagnaLabel) + '</div></div>';
  }
  if (opts.nakshatraLabel) {
    medsHTML += '<div class="med"><div class="med-g">✦</div><div class="med-l">' + L('උපන් නැකත', 'NAKSHATRA — BIRTH STAR') + '</div><div class="med-v">' + escapeHTML(opts.nakshatraLabel) + '</div></div>';
  }
  if (moonLabel) {
    medsHTML += '<div class="med"><div class="med-g"><span class="cres"></span></div><div class="med-l">' + L('චන්ද්‍ර රාශිය', 'MOON SIGN') + '</div><div class="med-v">' + escapeHTML(moonLabel) + '</div></div>';
  }

  var chartsHTML = '';
  if (normalizedRC) {
    var d1 = '<div class="chart-card"><div class="cc-t">' + L('උපන් කේන්දරය', 'BIRTH KENDARA — D1') + '</div>'
      + '<div class="cc-s">' + L('උපන් මොහොතේ ග්‍රහ පිහිටීම — එදිනෙදා ජීවිත රටා', 'The sky at your first breath — daily life patterns') + '</div>'
      + rptKendara(normalizedRC, chartLagnaId, opts.lang, 216, 'd1') + '</div>';
    var d9 = '';
    if (navHouses) {
      d9 = '<div class="chart-card d9"><div class="cc-t">' + L('නවාංශක කේන්දරය', 'NAVAMSHA — D9') + '</div>'
        + '<div class="cc-s">' + L('සබඳතා සහ අභ්‍යන්තර ජීවිතයේ ගැඹුරු දැක්ම', 'The inner chart — relationships and the deeper self') + '</div>'
        + rptKendara(navHouses, navLagnaId, opts.lang, 216, 'd9') + '</div>';
    }
    chartsHTML = '<div class="charts">' + d1 + d9 + '</div>';

    var keyParts = [];
    var keyOrder = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
    keyOrder.forEach(function(p) {
      var col = RPT_PLANET_DARK[p];
      keyParts.push('<span style="color:' + col + ';">' + (isSi ? PLANET_SI[p] : PLANET_SHORT[p] + ' ' + p) + '</span>');
    });
    keyParts.push('<span style="color:#F0D48A;">ල = ' + L('ලග්නය', 'Lagna') + '</span>');
    chartsHTML += '<div class="keys"><b>' + L('සංකේත', 'KEY') + '</b>' + keyParts.join(' · ') + '</div>';

    // Graha positions table — real almanac texture from the chart data
    var grahaOrder = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
    var grahaRows = [], seenGraha = {};
    normalizedRC.forEach(function(entry) {
      (entry.planets || []).forEach(function(p) {
        var pn = typeof p === 'string' ? p : (p.name || '');
        if (!pn || pn === 'Lagna' || pn === 'Ascendant' || seenGraha[pn]) return;
        seenGraha[pn] = true;
        grahaRows.push({ name: pn, rashiId: entry.rashiId, degree: (typeof p === 'object' && p.degree != null) ? p.degree : null });
      });
    });
    grahaRows.sort(function(a, b) {
      var ia = grahaOrder.indexOf(a.name), ib = grahaOrder.indexOf(b.name);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    if (grahaRows.length > 0) {
      var grahaCells = '';
      grahaRows.forEach(function(r) {
        var col = RPT_PLANET_DARK[r.name] || '#C9C2B2';
        var pname = isSi ? (PLANET_SI[r.name] || r.name) : r.name;
        var rname = (isSi ? PDF_RASHI_SI : PDF_RASHI_EN)[r.rashiId] || '';
        var deg = r.degree != null ? ' ' + Math.floor(r.degree) + '°' : '';
        grahaCells += '<div class="gr"><span class="gp"><b style="background:' + col + ';"></b>' + escapeHTML(pname) + '</span>'
          + '<span class="gv">' + escapeHTML(rname) + deg + '</span></div>';
      });
      chartsHTML += '<div class="note"><div class="note-cap">' + L('ග්‍රහ පිහිටීම්', 'GRAHA POSITIONS') + '</div>'
        + '<div class="graha-grid">' + grahaCells + '</div></div>';
    }
  }

  var identityHTML = '<div class="pg">'
    + '<div class="eyebrow">' + L('උපන් සටහන', 'THE BIRTH RECORD') + '</div>'
    + '<div class="pg-title">' + L('ඔබේ ආකාශ අනන්‍යතාව', 'Celestial Identity') + '</div>'
    + '<div class="pg-sub">' + L('ඔබ උපන් මොහොතේ අහස මෙසේ පිහිටා තිබුණා — මේ වාර්තාවේ සෑම කියවීමක්ම මේ සිතියම මත ගොඩනැගෙනවා.', 'The sky as it stood at the moment you were born — every reading in this almanac is built on this map.') + '</div>'
    + (medsHTML ? '<div class="meds">' + medsHTML + '</div>' : '')
    + '<div class="rec idn-rec">'
    + recRow(L('නම', 'NAME'), opts.userName)
    + recRow(L('උපන් ස්ථානය', 'BIRTHPLACE'), opts.birthLocation)
    + recRow(L('උපන් දිනය සහ වේලාව', 'DATE & TIME'), (opts.birthDate || '') + (opts.birthTime ? ' · ' + opts.birthTime : ''))
    + recRow(L('සූර්ය රාශිය', 'SUN SIGN'), sunLabel)
    + (refNo ? recRow(L('වාර්තා අංකය', 'DOCUMENT Nº'), refNo) : '')
    + '</div>'
    + chartsHTML
    + '</div>';

  // ═════ LIFE BALANCE ═════
  var heroKeys = ['career', 'marriage', 'health', 'financial', 'luck', 'education', 'children', 'foreignTravel', 'spiritual'];
  var heroScores = [];
  heroKeys.forEach(function(key) {
    var s = scoreFor(key);
    if (s != null) heroScores.push({ key: key, score: s });
  });
  var balanceHTML = '';
  if (heroScores.length > 0) {
    var avg = Math.round(heroScores.reduce(function(a, b) { return a + b.score; }, 0) / heroScores.length);
    var avgTier = rptTier(avg);
    var cells = '';
    heroScores.forEach(function(hs) {
      var tier = rptTier(hs.score);
      var canonical = RPT_AREA_NAMES[hs.key];
      var lbl2 = escapeHTML(canonical ? (isSi ? canonical.si : canonical.en) : hs.key);
      cells += '<div class="bal-cell"><div class="bc-name">' + lbl2 + '</div>'
        + '<div class="bc-score">' + hs.score + '<i>/100</i></div>'
        + '<div class="bc-bar"><div class="bc-fill" style="width:' + hs.score + '%;background:' + tier.color + ';"></div></div>'
        + '<div class="bc-tier" style="color:' + tier.color + ';">' + (isSi ? tier.si : tier.en) + '</div></div>';
    });
    balanceHTML = '<div class="pg">'
      + '<div class="eyebrow">' + L('මිනුම', 'THE MEASURE') + '</div>'
      + '<div class="pg-title">' + L('ජීවිත සමතුලනය', 'Life Balance') + '</div>'
      + '<div class="pg-sub">' + L('ඔබේ උපන් රටාවෙන් කියැවෙන ජීවිත ක්ෂේත්‍රවල සාපේක්ෂ ශක්තිය', 'The relative strength of each life area, read from your birth pattern') + '</div>'
      + '<div class="bal-hero">' + rptArc(avg, 128, avgTier.color, L('සමස්ත', 'OVERALL'))
      + '<div class="bal-verdict">' + (isSi ? avgTier.si : avgTier.en) + '</div>'
      + '<div class="bal-count">' + L('ක්ෂේත්‍ර ' + heroScores.length + 'ක විශ්ලේෂණය', heroScores.length + ' LIFE AREAS ANALYSED') + '</div></div>'
      + '<div class="bal-grid">' + cells + '</div>'
      + '<div class="tierleg">' + RPT_TIERS.slice().reverse().map(function(t2, i2, arr2) {
        var hi = i2 === arr2.length - 1 ? 100 : arr2[i2 + 1].min - 1;
        return '<div class="tl"><b style="background:' + t2.color + ';"></b><div class="t1" style="color:' + t2.color + ';">' + (isSi ? t2.si : t2.en) + '</div><div class="t2">' + t2.min + '–' + hi + '</div></div>';
      }).join('') + '</div>'
      + '</div>';
  }

  // ═════ NEXT 12 MONTHS ═════
  var calendar = narrativeSections.next12Months && narrativeSections.next12Months.rawData;
  var skyHTML = '';
  if (calendar && Array.isArray(calendar.months) && calendar.months.length > 0) {
    var winRows = '';
    (calendar.windows || []).slice(0, 5).forEach(function(w) {
      var dm = RPT_DOMAINS[w.domain] || { color: '#F0D48A', si: w.domain, en: w.domain };
      var isCaution = w.type === 'caution';
      var range = escapeHTML((w.startLabel || '') + (w.endLabel && w.endLabel !== w.startLabel ? ' → ' + w.endLabel : ''));
      var sub = isCaution
        ? L('පරිස්සමෙන් — ලොකු තීරණ මේ කාලයේ කල් දාන්න', 'Consolidate — hold big launches for later')
        : (w.peakLabel ? L('උපරිමය: ', 'Peak: ') + escapeHTML(w.peakLabel) : '');
      winRows += '<div class="win' + (isCaution ? ' caution' : '') + '">'
        + '<span class="win-gem" style="background:' + (isCaution ? '#E8836E' : dm.color) + ';"></span>'
        + '<div><div class="win-t">' + (isSi ? dm.si : dm.en) + (w.tier ? ' · ' + escapeHTML(String(w.tier)) : '') + ' — ' + range + '</div>'
        + (sub ? '<div class="win-s">' + sub + '</div>' : '') + '</div></div>';
    });
    var legend = '';
    Object.keys(RPT_DOMAINS).forEach(function(d) {
      legend += '<span><b style="background:' + RPT_DOMAINS[d].color + ';"></b>' + (isSi ? RPT_DOMAINS[d].si : RPT_DOMAINS[d].en) + '</span>';
    });
    skyHTML = '<div class="pg">'
      + '<div class="eyebrow">' + L('ඉදිරි වසර', 'THE YEAR AHEAD') + '</div>'
      + '<div class="pg-title">' + L('ඉදිරි මාස 12 — කාල සිතියම', 'Your Next 12 Months') + '</div>'
      + '<div class="pg-sub">' + L('සෑම මාසයකම වැඩිම ශක්තිය ඇති ජීවිත ක්ෂේත්‍රය සහ වැදගත් කාල කවුළු', 'The strongest life area of each month, and the windows that matter most') + '</div>'
      + '<div class="sky-plate">' + rptSkyline(calendar.months, isSi) + '<div class="legend">' + legend + '</div></div>'
      + (winRows ? '<div class="wins-cap">' + L('වැදගත් කාල කවුළු', 'KEY WINDOWS') + '</div><div class="wins">' + winRows + '</div>' : '')
      + '<div class="note"><div class="note-cap">' + L('කවුළු භාවිත කරන ආකාරය', 'USING THESE WINDOWS') + '</div>'
      + '<div class="nr"><b>✦</b><span>' + L('හොඳ කවුළුවක් = ලොකු පියවරකට හිතකර කාලයක් — අලුත් රැකියාවක්, ආයෝජනයක්, යෝජනාවක්.', 'A favourable window is the right moment for a bigger step — a job move, an investment, a proposal.') + '</span></div>'
      + '<div class="nr"><b>✦</b><span>' + L('අවවාද කවුළුවලදී ලොකු තීරණ කල් දමා, දැනට තිබෙන දේ ශක්තිමත් කරන්න.', 'In caution windows, hold the big launches and strengthen what you already have.') + '</span></div>'
      + '</div></div>';
  }

  // ═════ CHAPTERS ═════
  var chaptersHTML = '';
  chapters.forEach(function(ch) {
    var metaHTML = '';
    if (ch.score != null) {
      var tier = rptTier(ch.score);
      metaHTML = '<div class="ch-meta">' + rptArc(ch.score, 50, tier.color, '')
        + '<div class="chm-mid"><div class="chm-lbl">' + L('ක්ෂේත්‍ර ශක්තිය', 'AREA STRENGTH') + '</div>'
        + '<div class="chm-bar"><div class="chm-fill" style="width:' + ch.score + '%;background:' + tier.color + ';"></div></div></div>'
        + '<span class="chm-tier" style="color:' + tier.color + ';">' + (isSi ? tier.si : tier.en) + '</span></div>';
    }
    chaptersHTML += '<div class="pg"><div class="ch-head">'
      + '<div class="ch-ghost">' + pad2(ch.no) + '</div>'
      + '<div class="eyebrow" style="color:' + ch.accent + ';">' + L('පරිච්ඡේදය', 'CHAPTER') + ' ' + pad2(ch.no) + '</div>'
      + '<div class="ch-title">' + ch.title + '</div>'
      + metaHTML + '</div>'
      + '<div class="ch-body"><div class="prose">' + markdownToHTML(ch.narrative) + '</div></div>'
      + '<div class="rule" style="margin:22px 0 0;"><em>✦</em></div>'
      + '</div>';
  });

  // ═════ COLOPHON ═════
  var endHTML = '<div class="end">'
    + rptStars(595, 842, 120, 97)
    + '<div class="end-frame"></div>'
    + '<div class="end-medal">' + logoMedal + '</div>'
    + '<div class="end-brand">ග්‍රහචාර</div>'
    + '<div class="end-motto">' + L('ඔබේ ජීවිතයේ තරු බලන්න', 'Read the stars of your life') + '</div>'
    + '<div class="end-rule"><em>◆</em></div>'
    + '<div class="end-feats"><span>' + L('සතිපතා නැකැත්', 'WEEKLY NAKATH') + '</span><i>·</i><span>' + L('ජ්‍යෝතිෂ chat', 'ASTRO CHAT') + '</span><i>·</i><span>' + L('පොරොන්දම් ගැලපීම', 'PORONDAM MATCH') + '</span></div>'
    + '<div class="end-cta">' + L('යෙදුම බාගන්න', 'DOWNLOAD THE APP') + '</div>'
    + '<div class="end-url">www.grahachara.com</div>'
    + '<div class="end-prep">' + (isSi ? name + ' සඳහා ' + escapeHTML(genDate) + ' දින සකස් කරන ලදි' : 'Prepared for ' + name + ' on ' + escapeHTML(genDate)) + '</div>'
    + (refNo ? '<div class="end-ref">' + L('වාර්තා අංකය', 'DOCUMENT Nº') + ' ' + refNo + '</div>' : '')
    + '<div class="end-disc">' + L(
      'මේ වාර්තාව සාම්ප්‍රදායික වේදික ජ්‍යෝතිෂ ශාස්ත්‍රය මත පදනම් වෙනවා. මෙය අත්දැකීම් සහ මගපෙන්වීම් සඳහා පමණයි — වෛද්‍ය, නීතිමය හෝ මූල්‍ය උපදෙස් වෙනුවට භාවිත නොකරන්න.',
      'This reading is based on traditional Vedic astrology and is offered for reflection and guidance only — not as a substitute for medical, legal or financial advice.')
    + '</div></div>';

  // ═════ DOCUMENT ═════
  return '<!DOCTYPE html><html lang="' + (isSi ? 'si' : 'en') + '"><head>'
    + '<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>'
    + '<title>' + L('ග්‍රහචාර — සම්පූර්ණ ජීවිත වාර්තාව', 'Grahachara — Complete Life Reading') + '</title>'
    + '<style>' + reportPrintCSS(isSi) + '</style></head><body>'
    + '<div class="bg">' + rptStars(595, 842, 110, 11) + '</div>'
    + '<div class="wmk">ග්‍රහචාර</div>'
    + '<div class="frame"></div>'
    + '<div class="fc fc-tl"></div><div class="fc fc-tr"></div><div class="fc fc-bl"></div><div class="fc fc-br"></div>'
    + '<div class="folio-t">' + L('ග්‍රහචාර — සම්පූර්ණ ජීවිත වාර්තාව', 'GRAHACHARA — THE COMPLETE LIFE READING') + '</div>'
    + '<div class="folio-b"><span class="fb-name">' + name + '</span> <b>·</b> GRAHACHARA.COM' + (refNo ? ' <b>·</b> ' + refNo : '') + '</div>'
    + coverHTML + tocHTML + identityHTML + balanceHTML + skyHTML + chaptersHTML + endHTML
    + '</body></html>';
}

// ═══════════════════════════════════════════════════════════════
// ███ PORONDAM PDF ███
// Mirrors the in-app report in app/(tabs)/porondam.js:
// verdict-first archetype hero → numbered plain-language chapters
// (glance / strengths & care / seven signals / attraction / life now /
// deeper bond / wedding windows / birth stars / for the curious) →
// the two birth charts → chaptered written reading → method + guidance.
// ═══════════════════════════════════════════════════════════════

var PDF_RASHI_EN = ['', 'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
var PDF_RASHI_SI = ['', 'මේෂ', 'වෘෂභ', 'මිථුන', 'කටක', 'සිංහ', 'කන්‍යා', 'තුලා', 'වෘශ්චික', 'ධනු', 'මකර', 'කුම්භ', 'මීන'];

// The one-line verdict everyone understands — always a full plain phrase,
// never an archetype name or a bare rating word. Mirrors getVerdictPhrase
// in app/(tabs)/porondam.js; `dark` is the print-safe text variant of the
// app's on-screen colour (`fill`).
function pdfVerdictPhrase(data, isSi) {
  var pct = data.percentage != null ? data.percentage
    : (data.maxPossibleScore > 0 && data.totalScore != null ? Math.round((data.totalScore / data.maxPossibleScore) * 100) : null);
  if (pct == null) {
    return { text: isSi ? (data.ratingSinhala || data.rating || 'ගැළපීමේ ප්‍රතිඵලය') : (data.rating || 'Your match result'), dark: '#B08430', fill: '#E8C97A' };
  }
  if (pct >= 75) return { text: isSi ? 'ඉතා හොඳ ගැළපීමක්' : 'A Very Good Match', dark: '#0E9F6E', fill: '#34D399' };
  if (pct >= 55) return { text: isSi ? 'හොඳ ගැළපීමක්' : 'A Good Match', dark: '#B08430', fill: '#FBBF24' };
  if (pct >= 40) return { text: isSi ? 'සමබර ගැළපීමක්' : 'A Balanced Match', dark: '#7C3AED', fill: '#A78BFA' };
  return { text: isSi ? 'උත්සාහයෙන් වැඩෙන ගැළපීමක්' : 'A Match That Grows with Effort', dark: '#DB2777', fill: '#F472B6' };
}

var PDF_MAG_LABELS = {
  'Venus-Mars Spark': { en: 'Physical spark', si: 'කායික ආකර්ෂණය' },
  '7th House Resonance': { en: 'Partnership fit', si: 'සහකරු ගැළපීම' },
  'Nakshatra Lord Affinity': { en: 'Star-lord friendship', si: 'තරු අධිපති මිත්‍රත්වය' },
  'Rahu-Ketu Karmic Axis': { en: 'Karmic thread', si: 'කර්ම බැඳීම' },
  'Moon Emotional Sync': { en: 'Emotional sync', si: 'හැඟීම් සමමුහුර්තය' },
};

var PDF_YONI = {
  Horse: { si: 'අශ්ව', trait: { en: 'Free-spirited & adventurous', si: 'නිදහස් සිතැති, වේගවත්' } },
  Elephant: { si: 'ගජ', trait: { en: 'Powerful & protective', si: 'බලවත්, ආරක්ෂාකාරී' } },
  Goat: { si: 'ඡාග', trait: { en: 'Tender & affectionate', si: 'මෘදු, සෙනෙහෙබර' } },
  Serpent: { si: 'සර්ප', trait: { en: 'Intense & magnetic', si: 'තීව්‍ර, ආකර්ෂණීය' } },
  Dog: { si: 'ශ්වාන', trait: { en: 'Devoted & faithful', si: 'පක්ෂපාත, විශ්වාසවන්ත' } },
  Cat: { si: 'මාර්ජාර', trait: { en: 'Graceful & independent', si: 'සියුම්, ස්වාධීන' } },
  Rat: { si: 'මූෂික', trait: { en: 'Quick & adaptable', si: 'චතුර, අනුවර්තී' } },
  Cow: { si: 'ගව', trait: { en: 'Warm & nurturing', si: 'උණුසුම්, පෝෂණශීලී' } },
  Buffalo: { si: 'මහිෂ', trait: { en: 'Strong & enduring', si: 'ශක්තිමත්, ඉවසිලිවන්ත' } },
  Tiger: { si: 'ව්‍යාඝ්‍ර', trait: { en: 'Fierce & passionate', si: 'නිර්භීත, ආවේගශීලී' } },
  Deer: { si: 'මෘග', trait: { en: 'Romantic & sensitive', si: 'රොමැන්තික, සංවේදී' } },
  Monkey: { si: 'වානර', trait: { en: 'Playful & curious', si: 'ක්‍රීඩාශීලී, කුතුහලප්‍රිය' } },
  Mongoose: { si: 'නකුල', trait: { en: 'Bold & fearless', si: 'නිර්භය, ක්ෂණික' } },
  Lion: { si: 'සිංහ', trait: { en: 'Commanding & generous', si: 'අභිමානවත්, ත්‍යාගශීලී' } },
};

var PDF_ELEM = {
  Fire: { si: 'අග්නි', color: '#C2410C' },
  Earth: { si: 'පෘථිවි', color: '#4D7C0F' },
  Air: { si: 'වායු', color: '#1D4ED8' },
  Water: { si: 'ජල', color: '#0E7490' },
  Ether: { si: 'ආකාශ', color: '#7C3AED' },
};

var PDF_ELEM_METAPHORS = {
  'Fire+Water': { en: 'Steam when you meet — intense and transformative.', si: 'ගින්දරයි දියයි හමු වූ විට හුමාලයක් — තීව්‍රයි, පරිවර්තනීයයි.' },
  'Fire+Fire': { en: 'Two flames — passionate; just mind the pace so neither burns out.', si: 'ගිනිදැල් දෙකක් — ආවේගශීලීයි; දෙදෙනාම නොදැවෙන වේගයක් සොයාගන්න.' },
  'Fire+Earth': { en: 'Fire warms earth — you bring each other to life.', si: 'ගින්දර පොළොව උණුසුම් කරනවා — ඔබ එකිනෙකාට ජීවය දෙනවා.' },
  'Fire+Air': { en: 'Air fans the flame — lively, and always growing.', si: 'සුළඟ ගින්දර අවුළුවනවා — උද්‍යෝගී, නොනවතින වර්ධනයක්.' },
  'Water+Water': { en: 'A deep ocean together — emotionally boundless.', si: 'එකට ගැඹුරු සාගරයක් — හැඟීම්වලට සීමා නැහැ.' },
  'Water+Earth': { en: 'Water nourishes earth — a naturally fertile bond.', si: 'දිය පොළොව පෝෂණය කරනවා — ස්වාභාවිකවම සරුසාර බැඳීමක්.' },
  'Water+Air': { en: 'Mist and breeze — dreamy; a little grounding helps.', si: 'මීදුමයි සුළඟයි — සිහිනමය බැඳීමක්; පොළොවේ පය තැබීම වැදගත්.' },
  'Earth+Earth': { en: 'Solid bedrock — stable and unshakeable.', si: 'ස්ථිර පර්වතයක් — නොසැලෙන, විශ්වාසදායක බැඳීමක්.' },
  'Earth+Air': { en: 'Mountain and wind — steady yet free.', si: 'කන්දයි සුළඟයි — ස්ථාවරත්වයයි නිදහසයි එකට.' },
  'Air+Air': { en: 'Two winds — sparkling conversation; an anchor helps.', si: 'සුළං දෙකක් — අදහස්වල දිලිසීමක්; නැංගුරමක් උපකාරී වෙනවා.' },
};

var PDF_PLANET_DRIVE = {
  Sun: { en: 'Leadership & recognition', si: 'නායකත්වය සහ පිළිගැනීම' },
  Moon: { en: 'Emotional security & nurturing', si: 'හැඟීම් සුරක්ෂිතභාවය සහ රැකවරණය' },
  Mars: { en: 'Courage & achievement', si: 'ධෛර්යය සහ ජයග්‍රහණය' },
  Mercury: { en: 'Intellect & communication', si: 'බුද්ධිය සහ සන්නිවේදනය' },
  Jupiter: { en: 'Freedom & expansion', si: 'නිදහස සහ ප්‍රසාරණය' },
  Venus: { en: 'Love & beauty', si: 'ආදරය සහ සුන්දරත්වය' },
  Saturn: { en: 'Stability & discipline', si: 'ස්ථාවරත්වය සහ විනය' },
  Rahu: { en: 'Transformation & ambition', si: 'පරිවර්තනය සහ අභිලාෂය' },
  Ketu: { en: 'Inner freedom', si: 'අභ්‍යන්තර නිදහස' },
};

var PDF_PASTLIFE = {
  healer: { en: 'Healer', si: 'සුවකරු' }, warrior: { en: 'Warrior', si: 'රණශූර' },
  teacher: { en: 'Teacher', si: 'ගුරුවර' }, artist: { en: 'Artist', si: 'කලාකරු' },
  leader: { en: 'Leader', si: 'නායක' }, mystic: { en: 'Mystic', si: 'රහස්වාදී' },
  merchant: { en: 'Merchant', si: 'වෙළෙන්දා' }, scholar: { en: 'Scholar', si: 'විද්වතා' },
  caretaker: { en: 'Caretaker', si: 'රැකවරණකරු' }, explorer: { en: 'Explorer', si: 'ගවේෂක' },
  pioneer: { en: 'Pioneer', si: 'පුරෝගාමී' }, king: { en: 'Ruler', si: 'පාලක' },
  administrator: { en: 'Administrator', si: 'පරිපාලක' }, monk: { en: 'Monk', si: 'තවුසා' },
  hermit: { en: 'Hermit', si: 'තාපස' }, seeker: { en: 'Seeker', si: 'සොයන්නා' },
  philosopher: { en: 'Philosopher', si: 'දාර්ශනික' }, pilgrim: { en: 'Pilgrim', si: 'වන්දනාකරු' },
  writer: { en: 'Writer', si: 'ලේඛක' }, messenger: { en: 'Messenger', si: 'පණිවිඩකරු' },
  soldier: { en: 'Soldier', si: 'සෙබළ' }, farmer: { en: 'Farmer', si: 'ගොවි' },
  landowner: { en: 'Landowner', si: 'ඉඩම් හිමි' }, priest: { en: 'Priest', si: 'පූජක' },
  performer: { en: 'Performer', si: 'රංගන ශිල්පී' }, servant: { en: 'Helper', si: 'සේවක' },
  partner: { en: 'Partner', si: 'හවුල්කරු' }, diplomat: { en: 'Diplomat', si: 'තානාපති' },
  researcher: { en: 'Researcher', si: 'පර්යේෂක' }, alchemist: { en: 'Alchemist', si: 'රසවාදී' },
  trader: { en: 'Trader', si: 'වෙළඳ' }, banker: { en: 'Banker', si: 'බැංකුකරු' },
  networker: { en: 'Networker', si: 'ජාලකරු' }, elder: { en: 'Elder', si: 'වැඩිහිටි' },
  mediator: { en: 'Mediator', si: 'මධ්‍යස්ථ' },
};

// Chapter titles/labels — mirrors L in app/(tabs)/porondam.js
var PDF_PT = {
  en: {
    bride: 'Bride', groom: 'Groom',
    coverTitle: 'Marriage Match', coverSub: 'All the porondam checks — explained in simple words',
    headerTag: 'Marriage Match Report',
    heroKicker: 'YOUR MATCH, READ AS ONE',
    bondStyle: 'YOUR BOND STYLE',
    heroEssence: 'Your full report unfolds below, step by step, in simple words.',
    tradCount: 'Traditional porondams',
    glanceTitle: 'At a glance', glanceSub: 'The three things to know first',
    glanceStrong: 'What matches best', glanceCare: 'What needs the most care', glanceTiming: 'About timing',
    scTitle: 'What’s good & what needs care', scSub: 'Both sides honestly — nothing hidden, nothing scary',
    scGifts: 'What’s already good', scCare: 'What to look after', scPaths: 'What you can do next',
    scSignificant: 'An important point — please consider it',
    factors: 'The seven porondam checks', factorsSub: 'The traditional 20 points — what each check means, in plain words',
    signalsNote: 'Scored the traditional way — 20 points across the classical porondam checks, read from both charts.',
    attractionTitle: 'Attraction & closeness', attractionSub: 'How strong the pull between you is, and what kind it is',
    naturesTitle: 'Your two natures',
    lifeNowTitle: 'Life right now', lifeNowSub: 'What kind of period each of you is going through',
    deepTitle: 'The deeper bond', deepSub: 'Checks that look at married life itself, beyond the surface',
    weddingTitle: 'Good wedding dates', weddingSub: 'Time periods that are good in both charts at once',
    noWindows: 'No shared favourable period was found',
    starsTitle: 'Your birth stars', starsSub: 'The key details an astrologer would ask for — sign, star, ruler',
    curioTitle: 'For the curious', curioSub: 'Symbolic readings — fun to explore, not for decisions',
    chartsTitle: 'The Two Birth Charts',
    brideChart: 'Bride’s Birth Chart', groomChart: 'Groom’s Birth Chart',
    report: 'The Written Report', readerChapters: 'chapters', readerMin: 'min read',
    readerSub: 'Written from both charts — read it together, slowly.',
    methodTitle: 'How this report is made',
    methodBody: 'First we build both birth charts from the date, time and place you gave. Then we read the seven porondam checks, the navamsha match (the chart for married life), the life periods you are each in now, and the Mars check — the same order a traditional matcher follows, calculated precisely.',
    guidanceNote: 'This report is here to help you think — it is not a final verdict on your future. The decision, and the relationship, always belong to you two.',
  },
  si: {
    bride: 'මනාලිය', groom: 'මනාලයා',
    coverTitle: 'පොරොන්දම් ගැළපීම', coverSub: 'පොරොන්දම් සියල්ල — සරල බසින්, තේරෙන විදියට',
    headerTag: 'පොරොන්දම් වාර්තාව',
    heroKicker: 'ඔබ දෙදෙනාගේ ගැළපීම — සම්පූර්ණ කියවීම',
    bondStyle: 'ඔබේ බැඳීමේ විදිය',
    heroEssence: 'ඔබ දෙදෙනාගේ සම්පූර්ණ වාර්තාව පහතින්, පියවරෙන් පියවර සරලව විස්තර වෙනවා.',
    tradCount: 'සම්ප්‍රදායික පොරොන්දම්',
    glanceTitle: 'එක බැල්මෙන්', glanceSub: 'මුලින්ම දැනගත යුතු කරුණු තුන',
    glanceStrong: 'හොඳින්ම ගැළපෙන දේ', glanceCare: 'වැඩිපුරම බලාගත යුතු දේ', glanceTiming: 'කාලය ගැන',
    scTitle: 'ගැළපෙන තැන් සහ හදාගත යුතු තැන්', scSub: 'ඇත්ත ඇති සැටියෙන් — සැඟවීමකුත් නැහැ, බය කිරීමකුත් නැහැ',
    scGifts: 'දැනටමත් හොඳින් ගැළපෙන තැන්', scCare: 'සැලකිලිමත් විය යුතු තැන්', scPaths: 'ඉදිරියට යන මග',
    scSignificant: 'වැදගත් කරුණක් — සලකා බලන්න',
    factors: 'පොරොන්දම් හත', factorsSub: 'එක් එක් පොරොන්දම, තේරෙන බසින් — සම්ප්‍රදායික ලකුණු 20',
    signalsNote: 'ලකුණු ගණන් කරන්නේ පැරණි සම්ප්‍රදායික ක්‍රමයටමයි — කේන්දර දෙකෙන් කියවෙන පොරොන්දම් ලකුණු 20ක් ලෙස.',
    attractionTitle: 'ආකර්ෂණය සහ සමීපකම', attractionSub: 'දෙදෙනා අතර ඇදීම — කොපමණද, කොහොමද',
    naturesTitle: 'දෙදෙනාගේ ස්වභාවය',
    lifeNowTitle: 'මේ දවස්වල ජීවිතය', lifeNowSub: 'දෙදෙනා දැන් ගෙවන්නේ මොන වගේ කාලයක්ද',
    deepTitle: 'ගැඹුරු බැඳීම', deepSub: 'මතුපිට ලකුණුවලට එහායින් — විවාහ ජීවිතයම ගැන බලන පරීක්ෂා',
    weddingTitle: 'විවාහයට සුබම කාල', weddingSub: 'කේන්දර දෙකටම එකවර හිතකර කාල වකවානු',
    noWindows: 'දෙකටම ගැළපෙන සුබ කාලයක් හමු වුණේ නැහැ',
    starsTitle: 'උපන් නැකැත් සහ රාශි', starsSub: 'ජ්‍යෝතිෂවේදියෙක් මුලින්ම අහන විස්තර — රාශිය, නැකැත, අධිපති ග්‍රහයා',
    curioTitle: 'රසවත් අමතර කියවීම්', curioSub: 'හිතට රසවත් සංකේත කියවීම් — තීරණවලට නම් නොවේ',
    chartsTitle: 'උපන් කේන්දර දෙක',
    brideChart: 'මනාලියගේ කේන්දරය', groomChart: 'මනාලයාගේ කේන්දරය',
    report: 'ලිඛිත වාර්තාව', readerChapters: 'පරිච්ඡේද', readerMin: 'මිනි. කියවීම',
    readerSub: 'කේන්දර දෙකම බලා ලියූ වාර්තාව — දෙදෙනාම එකට, හෙමින් කියවන්න.',
    methodTitle: 'මේ වාර්තාව හැදෙන විදිය',
    methodBody: 'මුලින්ම, ඔබ දුන් උපන් දිනය, වේලාව සහ ස්ථානය අනුව දෙදෙනාගේ කේන්දර දෙක හදනවා. ඉන්පසු පොරොන්දම් හත, නවාංශක ගැළපීම (විවාහ ජීවිතය ගැනම බලන කේන්දරය), දැන් ගෙවෙන දශා කාල සහ කුජ පරීක්ෂාව — පරම්පරාවෙන් ආ පිළිවෙළටම — නිවැරදිව ගණනය කරනවා.',
    guidanceNote: 'මේ වාර්තාව තිබෙන්නේ ඔබට හිතන්න උදව්වක් විදියටයි — ඔබේ අනාගතය ගැන අවසාන තීන්දුවක් නොවේ. තීරණයත්, සම්බන්ධයත් හැම විටම ඔබ දෙදෙනාගේමයි.',
  },
};

// Split the written reading into chapters on #/## headings.
// Mirrors splitReportSections in app/(tabs)/porondam.js.
function pdfSplitReportSections(md) {
  if (!md || typeof md !== 'string') return null;
  var lines = md.replace(/\r\n/g, '\n').split('\n');
  var intro = [];
  var sections = [];
  var current = null;
  for (var i = 0; i < lines.length; i++) {
    var m = lines[i].match(/^#{1,2}\s+(.+?)\s*$/);
    if (m) {
      if (current) sections.push(current);
      current = { title: m[1].trim(), body: [] };
    } else if (current) {
      current.body.push(lines[i]);
    } else {
      intro.push(lines[i]);
    }
  }
  if (current) sections.push(current);
  if (sections.length < 2) return null;

  function splitGlyph(title) {
    var m2 = title.match(/^([^A-Za-z0-9඀-෿ऀ-ॿ]+)(.+)$/);
    if (!m2) return { glyph: null, title: title };
    var lead = m2[1].trim();
    var rest = m2[2].trim();
    var hasSymbol = false;
    for (var c = 0; c < lead.length; c++) {
      if (lead.charCodeAt(c) >= 0x2190) { hasSymbol = true; break; }
    }
    if (!hasSymbol || !rest) return { glyph: null, title: title };
    return { glyph: lead, title: rest };
  }

  var parsed = sections.map(function (s) {
    var g = splitGlyph(s.title);
    return { glyph: g.glyph, title: g.title, body: s.body.join('\n').trim() };
  }).filter(function (s) { return s.body.length > 0 || s.title.length > 0; });

  return { intro: intro.join('\n').trim(), sections: parsed };
}

// Print styles for the porondam chapter layout
function porondamPrintCSS() {
  return ''
    + '.phero{background:linear-gradient(180deg,#FFFDF6,#FFF6E4);border:1px solid rgba(214,168,58,.42);border-top:3px solid var(--gold);border-radius:24px;padding:26px 24px 22px;margin-bottom:16px;text-align:center;page-break-inside:avoid;box-shadow:0 14px 40px rgba(72,52,24,.08);}'
    + '.phero-kicker{font-size:9.5px;font-weight:900;letter-spacing:2.4px;text-transform:uppercase;color:#B08430;margin-bottom:16px;}'
    + '.phero-medals{display:flex;align-items:flex-start;justify-content:center;gap:8px;margin-bottom:14px;}'
    + '.pmedal{width:120px;}'
    + '.pmedal-ring{width:56px;height:56px;border-radius:50%;border:2px solid;margin:0 auto 7px;display:flex;align-items:center;justify-content:center;font-size:24px;background:#fff;}'
    + '.pmedal-name{font-size:12.5px;font-weight:900;}'
    + '.pmedal-sign{font-size:10px;color:var(--muted);margin-top:1px;}'
    + '.pthread{display:flex;align-items:center;width:76px;margin-top:26px;}'
    + '.pthread-line{flex:1;height:1.5px;background:linear-gradient(90deg,rgba(214,168,58,.12),rgba(214,168,58,.75),rgba(214,168,58,.12));}'
    + '.pthread-heart{font-size:13px;margin:0 5px;line-height:1;}'
    + '.phero-name{font-size:25px;font-weight:900;color:var(--ink);letter-spacing:.2px;line-height:1.25;}'
    + '.pstyle-caption{font-size:8.5px;font-weight:900;letter-spacing:1.8px;text-transform:uppercase;color:#A79B84;margin-top:9px;}'
    + '.pstyle-name{font-size:14px;font-weight:900;margin-top:2px;}'
    + '.phero-essence{font-size:12.5px;line-height:1.65;color:var(--ink-2);max-width:430px;margin:8px auto 0;}'
    + '.phero-count{display:inline-block;margin-top:14px;padding:7px 14px;border-radius:999px;border:1px solid rgba(176,132,48,.4);background:rgba(217,164,65,.09);color:#B08430;font-size:11px;font-weight:800;}'
    + '.pchap{background:#fff;border:1px solid rgba(214,168,58,.30);border-radius:20px;padding:20px 22px;margin-bottom:14px;box-shadow:0 10px 28px rgba(32,26,46,.05);page-break-inside:avoid;}'
    + '.pchap.pflow{page-break-inside:auto;}'
    + '.pchap-head{display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;}'
    + '.pchap-num{font-size:20px;font-weight:900;color:rgba(176,132,48,.42);line-height:1.2;min-width:26px;}'
    + '.pchap-hgroup{flex:1;}'
    + '.pchap-title{font-size:15px;font-weight:900;color:var(--ink);letter-spacing:.1px;}'
    + '.pchap-sub{font-size:10.5px;color:var(--muted);margin-top:2px;line-height:1.5;}'
    + '.pchip{display:inline-block;padding:3px 10px;border-radius:999px;border:1px solid;font-size:10px;font-weight:900;white-space:nowrap;}'
    + '.pglance{margin-bottom:11px;}'
    + '.pglance-label{font-size:9px;font-weight:900;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:2px;}'
    + '.pglance-text{font-size:12px;line-height:1.62;color:var(--ink-2);}'
    + '.pschead{font-size:10px;font-weight:900;letter-spacing:1.2px;text-transform:uppercase;margin:10px 0 8px;}'
    + '.pscrow{display:flex;gap:8px;margin-bottom:9px;page-break-inside:avoid;}'
    + '.pscmark{font-weight:900;line-height:1.5;}'
    + '.pscarea{font-size:12.5px;font-weight:800;color:var(--ink);}'
    + '.psctext{font-size:11.5px;line-height:1.6;color:#5B5468;margin-top:1px;}'
    + '.pscbox{background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.28);border-radius:12px;padding:11px 12px;margin-bottom:9px;page-break-inside:avoid;}'
    + '.psctag{font-size:8.5px;font-weight:900;letter-spacing:1px;text-transform:uppercase;color:#B45309;margin-bottom:3px;}'
    + '.pscpath{font-size:11px;line-height:1.55;color:#B08430;font-style:italic;margin-top:4px;}'
    + '.psig{padding:12px 0;border-top:1px solid rgba(32,26,46,.06);page-break-inside:avoid;}'
    + '.psig-top{display:flex;align-items:center;gap:10px;}'
    + '.psig-names{flex:1;}'
    + '.psig-name{font-size:13px;font-weight:900;color:var(--ink);}'
    + '.psig-tech{font-size:10px;color:#A79B84;margin-top:1px;}'
    + '.psig-score{font-size:11px;font-weight:800;color:#8A8095;margin-left:6px;white-space:nowrap;}'
    + '.psig-what{font-size:10.5px;line-height:1.55;color:#7A7188;margin-top:6px;}'
    + '.psig-track{height:6px;background:rgba(32,26,46,.06);border-radius:99px;overflow:hidden;margin-top:8px;}'
    + '.psig-fill{height:6px;border-radius:99px;}'
    + '.psig-insight{font-size:11.5px;line-height:1.62;color:#6B5A2E;margin-top:7px;}'
    + '.pnote{font-size:10.5px;line-height:1.6;color:#9A8F7D;margin-top:12px;text-align:center;font-style:italic;}'
    + '.pmag{display:flex;align-items:center;gap:10px;margin-bottom:9px;}'
    + '.pmag-label{width:150px;font-size:11.5px;font-weight:700;color:var(--ink-2);}'
    + '.pmag-bar{flex:1;height:6px;background:rgba(32,26,46,.06);border-radius:99px;overflow:hidden;}'
    + '.pmag-fill{height:6px;border-radius:99px;}'
    + '.pmag-score{font-size:11px;font-weight:800;width:38px;text-align:right;}'
    + '.pnatures{display:flex;gap:10px;align-items:stretch;margin-top:6px;}'
    + '.pnature{flex:1;text-align:center;padding:12px 10px;border:1px solid rgba(32,26,46,.08);border-radius:14px;background:#FFFDF8;}'
    + '.pnature-who{font-size:9.5px;font-weight:800;color:#9A90A5;text-transform:uppercase;letter-spacing:.6px;}'
    + '.pnature-name{font-size:14px;font-weight:900;color:var(--ink);margin-top:3px;}'
    + '.pnature-trait{font-size:10.5px;color:var(--muted);margin-top:2px;line-height:1.5;}'
    + '.pnature-mid{display:flex;align-items:center;justify-content:center;font-size:15px;color:#B08430;}'
    + '.pnarr{margin-top:10px;padding:9px 12px;border:1px dashed rgba(214,168,58,.45);border-radius:12px;font-size:11px;line-height:1.6;color:#6B5A2E;background:rgba(255,248,232,.6);}'
    + '.pdeep{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-top:1px solid rgba(32,26,46,.05);page-break-inside:avoid;}'
    + '.pdeep-main{flex:1;}'
    + '.pdeep-title{font-size:12.5px;font-weight:800;color:var(--ink);}'
    + '.pdeep-cap{font-size:10px;color:#A79B84;margin-top:1px;}'
    + '.pdeep-desc{font-size:11.5px;line-height:1.6;color:#5B5468;margin-top:4px;}'
    + '.pharmony{margin-top:10px;padding-top:10px;border-top:1px solid rgba(32,26,46,.06);font-size:11.5px;line-height:1.6;color:#6B5A2E;}'
    + '.pwed{display:flex;gap:10px;padding:10px 0;border-top:1px solid rgba(32,26,46,.05);page-break-inside:avoid;}'
    + '.pwed-dates{font-size:12.5px;font-weight:900;}'
    + '.pbest{display:inline-block;margin-left:8px;padding:2px 8px;border-radius:999px;background:rgba(14,159,110,.10);border:1px solid rgba(14,159,110,.35);color:#0E9F6E;font-size:8.5px;font-weight:900;letter-spacing:.8px;vertical-align:1px;}'
    + '.pwed-reason{font-size:11px;color:#6E6580;margin-top:2px;line-height:1.55;}'
    + '.pwed-meta{font-size:10px;color:#9A8F7D;margin-top:2px;}'
    + '.ppills{display:flex;gap:12px;}'
    + '.ppill{flex:1;padding:12px 14px;border:1px solid rgba(32,26,46,.08);border-radius:14px;background:#FFFDF8;}'
    + '.ppill-name{font-size:12.5px;font-weight:900;}'
    + '.ppill-sign{font-size:12px;font-weight:800;color:var(--ink-2);margin-top:4px;}'
    + '.ppill-star{font-size:11px;color:#6E6580;margin-top:2px;}'
    + '.ppill-lord{font-size:10px;color:#B08430;margin-top:4px;font-weight:700;}'
    + '.pelems{display:flex;gap:10px;align-items:center;margin-top:12px;}'
    + '.pelem{flex:1;text-align:center;padding:10px;border:1px solid rgba(32,26,46,.07);border-radius:12px;background:#FFFDF8;}'
    + '.pelem-name{font-size:12.5px;font-weight:900;}'
    + '.pelem-who{font-size:9.5px;color:#9A90A5;margin-top:2px;}'
    + '.pmeta{margin-top:10px;text-align:center;font-size:11px;font-style:italic;color:#6B5A2E;line-height:1.6;}'
    + '.pcurio-block{font-size:10px;font-weight:900;letter-spacing:1.1px;text-transform:uppercase;color:#B08430;margin:10px 0 8px;}'
    + '.psoul{display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid rgba(32,26,46,.05);}'
    + '.psoul-main{flex:1;}'
    + '.psoul-who{font-size:10px;color:#9A90A5;font-weight:800;}'
    + '.psoul-drive{font-size:12px;font-weight:800;color:var(--ink);margin-top:1px;}'
    + '.psoul-planet{font-size:11px;font-weight:900;color:#B08430;}'
    + '.preader-cover{text-align:center;padding:18px 14px 14px;border-bottom:1px solid rgba(214,168,58,.25);margin-bottom:14px;background:linear-gradient(180deg,rgba(214,168,58,.07),transparent);border-radius:14px 14px 0 0;}'
    + '.preader-kicker{font-size:9.5px;font-weight:900;letter-spacing:2.2px;text-transform:uppercase;color:#B08430;}'
    + '.preader-names{font-size:17px;font-weight:900;color:var(--ink);margin-top:6px;}'
    + '.preader-meta{margin-top:8px;}'
    + '.preader-chip{display:inline-block;margin:0 4px;padding:3px 10px;border-radius:999px;border:1px solid rgba(176,132,48,.35);font-size:9.5px;font-weight:800;color:#8A6A20;background:rgba(217,164,65,.08);}'
    + '.preader-hint{font-size:10.5px;color:var(--muted);margin-top:8px;font-style:italic;}'
    + '.prchap{margin-bottom:12px;}'
    + '.prchap-head{display:flex;align-items:center;gap:9px;padding:9px 12px;background:rgba(255,248,232,.75);border:1px solid rgba(214,168,58,.3);border-radius:12px;page-break-inside:avoid;page-break-after:avoid;}'
    + '.prchap-glyph{font-size:13px;line-height:1;}'
    + '.prchap-title{font-size:13px;font-weight:900;color:var(--ink);}'
    + '.prchap-body{padding:10px 6px 2px;}'
    + '.pmethod{background:#fff;border:1px solid rgba(214,168,58,.3);border-radius:18px;padding:18px 20px;margin-bottom:14px;page-break-inside:avoid;}'
    + '.pmethod-title{font-size:12px;font-weight:900;color:var(--ink);letter-spacing:.4px;margin-bottom:8px;}'
    + '.pmethod-body{font-size:11px;line-height:1.7;color:#5B5468;}'
    + '.pguidance{margin-top:12px;padding:12px 14px;border:1px solid rgba(214,168,58,.45);border-radius:12px;background:rgba(255,248,232,.8);font-size:11.5px;line-height:1.65;color:#6B5A2E;font-weight:600;}';
}

function generatePorondamHTML(opts) {
  var isSi = opts.lang === 'si';
  var lang = isSi ? 'si' : 'en';
  var PT = PDF_PT[lang];
  var data = opts.data || {};
  var brideName = opts.brideName || PT.bride;
  var groomName = opts.groomName || PT.groom;
  var esc = escapeHTML;

  var brideRashiId = (data.brideChart && data.brideChart.lagnaRashiId) || (data.bride && data.bride.rashi && data.bride.rashi.id);
  var groomRashiId = (data.groomChart && data.groomChart.lagnaRashiId) || (data.groom && data.groom.rashi && data.groom.rashi.id);

  var cr = data.coupleReading && (data.coupleReading[lang] || data.coupleReading.en);
  // Older saved results carry no coupleReading — derive the archetype the
  // same way the results screen does, so the PDF never loses the bond style.
  if (!cr || !cr.archetype) {
    if (brideRashiId && groomRashiId) {
      cr = {
        archetype: deriveArchetype(brideRashiId, groomRashiId, lang),
        gifts: (cr && cr.gifts) || [],
        nurture: (cr && cr.nurture) || [],
        forwardPaths: (cr && cr.forwardPaths) || [],
        traditionalCount: { score: data.totalScore != null ? data.totalScore : null, max: data.maxPossibleScore || 20 },
      };
    }
  }
  var adv = data.advancedPorondam && data.advancedPorondam.advanced;
  var jm = data.jyotishMatching;
  var factors = data.factors || [];

  function tierFor(pct) {
    return pct >= 0.7 ? PDF_TIERS.good : pct >= 0.4 ? PDF_TIERS.mixed : PDF_TIERS.poor;
  }

  function chip(text, textColor, lineColor, softColor) {
    return '<span class="pchip" style="color:' + textColor + ';border-color:' + lineColor + ';background:' + softColor + ';">' + esc(text) + '</span>';
  }

  function chapterShell(index, title, sub, rightHTML, bodyHTML, flow) {
    return '<div class="pchap' + (flow ? ' pflow' : '') + '">'
      + '<div class="pchap-head">'
      + (index ? '<div class="pchap-num">' + index + '</div>' : '')
      + '<div class="pchap-hgroup"><div class="pchap-title">' + esc(title) + '</div>'
      + (sub ? '<div class="pchap-sub">' + esc(sub) + '</div>' : '')
      + '</div>'
      + (rightHTML ? '<div>' + rightHTML + '</div>' : '')
      + '</div>' + bodyHTML + '</div>';
  }

  // ── Cover ──────────────────────────────────────────────────────
  // background-image div instead of <img>+object-fit — the print
  // rasteriser intermittently drops/half-paints <img> in rounded clips.
  var logoTag = opts.logoBase64
    ? '<div style="width:100%;height:100%;border-radius:22px;background:#160B22 url(data:image/png;base64,' + opts.logoBase64 + ') center/cover no-repeat;"></div>'
    : '<div style="font-size:44px;">💍</div>';
  var coverHTML = '<div class="cover cover-porondam">'
    + '<div class="zr" style="border-color:rgba(249,168,212,0.15);"></div><div class="zri" style="border-color:rgba(255,255,255,0.05);"></div>'
    + '<div class="cc"><div class="cl" style="border-color:rgba(249,168,212,0.5);">' + logoTag + '</div>'
    + '<div class="cb">ග්‍රහචාර</div>'
    + '<div class="ct"><span class="ctg">' + esc(PT.coverTitle) + '</span></div>'
    + '<div class="cs">' + esc(PT.coverSub) + '</div>'
    + '<div class="cd"></div>'
    + '<div class="cn">' + esc(brideName) + '<span style="display:block;font-size:14px;color:rgba(255,255,255,0.5);margin:6px 0;font-weight:400;">' + (isSi ? 'සහ' : '&') + '</span>' + esc(groomName) + '</div>'
    + '</div><div class="cfb">' + new Date().toLocaleDateString() + '</div></div>';

  // ── Verdict hero — the plain verdict phrase is the headline, the
  // archetype is a small labelled "bond style" line, X/20 stands by ──
  var arc = cr && cr.archetype;
  var verdict = pdfVerdictPhrase(data, isSi);
  var count = cr && cr.traditionalCount && cr.traditionalCount.score != null
    ? cr.traditionalCount
    : { score: data.totalScore, max: data.maxPossibleScore || 20 };
  var essence = arc && arc.essence ? arc.essence : PT.heroEssence;

  function medal(name, rashiId, ringColor, nameColor) {
    var glyph = rashiId >= 1 && rashiId <= 12 ? ZODIAC_SYMBOLS[rashiId - 1] : '✶';
    var sign = rashiId >= 1 && rashiId <= 12 ? (isSi ? PDF_RASHI_SI[rashiId] : PDF_RASHI_EN[rashiId]) : '';
    return '<div class="pmedal">'
      + '<div class="pmedal-ring" style="border-color:' + ringColor + ';color:' + nameColor + ';">' + glyph + '</div>'
      + '<div class="pmedal-name" style="color:' + nameColor + ';">' + esc(name) + '</div>'
      + (sign ? '<div class="pmedal-sign">' + esc(sign) + '</div>' : '')
      + '</div>';
  }

  var heroHTML = '<div class="phero" style="border-top-color:' + verdict.fill + ';">'
    + '<div class="phero-kicker">' + esc(PT.heroKicker) + '</div>'
    + '<div class="phero-medals">'
    + medal(brideName, brideRashiId, 'rgba(236,72,153,0.5)', '#BE185D')
    + '<div class="pthread"><span class="pthread-line"></span><span class="pthread-heart" style="color:' + verdict.dark + ';">♥</span><span class="pthread-line"></span></div>'
    + medal(groomName, groomRashiId, 'rgba(59,130,246,0.5)', '#1D4ED8')
    + '</div>'
    + '<div class="phero-name">' + esc(verdict.text) + '</div>'
    + (arc ? '<div class="pstyle-caption">' + esc(PT.bondStyle) + '</div><div class="pstyle-name" style="color:' + verdict.dark + ';">' + esc(arc.name) + '</div>' : '')
    + '<div class="phero-essence">' + esc(essence) + '</div>'
    + (count.score != null ? '<div class="phero-count">' + esc(PT.tradCount) + ': <strong style="color:#8A5A17;">' + count.score + '/' + count.max + '</strong></div>' : '')
    + '</div>';

  // ── 01 · At a glance — mirrors buildGlance ─────────────────────
  var glanceRows = [];
  (function buildGlance() {
    var scored = factors.filter(function (f) { return f.maxScore > 0; });
    if (scored.length > 0) {
      var best = scored.reduce(function (a, b) { return (b.score / b.maxScore) > (a.score / a.maxScore) ? b : a; });
      if (best.score / best.maxScore >= 0.6) {
        var bc = pdfSignalCopy(best.name, isSi, best.score, best.maxScore);
        glanceRows.push({ color: '#0E9F6E', label: PT.glanceStrong, text: bc.plainName + ' — ' + bc.insight });
      }
    }
    var care = cr && cr.nurture && cr.nurture.length > 0 ? cr.nurture[0] : null;
    if (care) {
      glanceRows.push({ color: '#B08430', label: PT.glanceCare, text: care.area + ' — ' + care.text });
    } else if (scored.length > 0) {
      var low = scored.reduce(function (a, b) { return (b.score / b.maxScore) < (a.score / a.maxScore) ? b : a; });
      if (low.score / low.maxScore < 0.5) {
        var lc = pdfSignalCopy(low.name, isSi, low.score, low.maxScore);
        glanceRows.push({ color: '#B08430', label: PT.glanceCare, text: lc.plainName + ' — ' + lc.insight });
      }
    }
    var windows = adv && adv.weddingWindows && adv.weddingWindows.favorableWindows;
    var realWindows = (windows || []).filter(function (w) { return w.end && w.end.length > 0; });
    if (realWindows.length > 0) {
      glanceRows.push({
        color: '#7C3AED', label: PT.glanceTiming,
        text: isSi
          ? 'ඉදිරි වසර 3 තුළ දෙදෙනාටම හිතකර විවාහ කාල ' + realWindows.length + 'ක් හමු වුණා — විස්තර පහතින්.'
          : realWindows.length + ' favourable wedding ' + (realWindows.length === 1 ? 'window' : 'windows') + ' found for you both in the next 3 years — details below.',
      });
    } else {
      var harmony = adv && adv.dashaCompatibility && adv.dashaCompatibility.harmony;
      if (harmony === 'harmonious') {
        glanceRows.push({ color: '#7C3AED', label: PT.glanceTiming, text: isSi ? 'දෙදෙනාම දැන් ගෙවන්නේ එකිනෙකාට සහාය දෙන ජීවිත කාලයක් — හවුල් තීරණවලට හොඳ මොහොතක්.' : 'You are both moving through supportive life periods right now — a good moment for shared decisions.' });
      } else if (harmony === 'conflicting') {
        glanceRows.push({ color: '#7C3AED', label: PT.glanceTiming, text: isSi ? 'දෙදෙනාගේ වත්මන් ජීවිත කාල වෙනස් රිද්මවල — ලොකු තීරණ ඉවසීමෙන්, කතා කරමින් ගන්න.' : 'Your current life periods run on different rhythms — take big decisions patiently, and talk them through.' });
      }
    }
  })();

  function glanceChapter(ix) {
    var body = glanceRows.map(function (r) {
      return '<div class="pglance"><div class="pglance-label" style="color:' + r.color + ';">' + esc(r.label) + '</div>'
        + '<div class="pglance-text">' + esc(r.text) + '</div></div>';
    }).join('');
    return chapterShell(ix, PT.glanceTitle, PT.glanceSub, '', body);
  }

  // ── 02 · Strengths & care — mirrors buildStrengthsCare ─────────
  var scContent = (function buildStrengthsCare() {
    var gifts = (cr && cr.gifts ? cr.gifts.slice() : []);
    var nurture = (cr && cr.nurture ? cr.nurture.slice() : []);
    var paths = (cr && cr.forwardPaths ? cr.forwardPaths.slice() : []);

    if (gifts.length === 0 && nurture.length === 0) {
      // Legacy fallback — derive from the classical factors + doshas.
      factors.forEach(function (f) {
        if (!f.maxScore) return;
        var ratio = f.score / f.maxScore;
        var copy = pdfSignalCopy(f.name, isSi, f.score, f.maxScore);
        if (ratio >= 0.75) {
          gifts.push({ area: copy.plainName, text: copy.insight });
        } else if (ratio < 0.5) {
          var serious = (f.name === 'Nadi' || f.name === 'Rajju' || f.name === 'Vedha') && ratio < 0.25;
          nurture.push({ area: copy.plainName, text: copy.insight, severity: serious ? 'significant' : 'gentle' });
        }
      });
      (data.doshas || []).forEach(function (d) {
        var cc = pdfChallengeCopy(d, isSi);
        var sev = String(d.severity || '').toLowerCase().indexOf('severe') !== -1 && !d.cancelled ? 'significant' : 'gentle';
        nurture.push({ area: cc.label, text: cc.desc, severity: d.cancelled ? 'gentle' : sev });
      });
      nurture.sort(function (a, b) { return (a.severity === 'significant' ? -1 : 0) - (b.severity === 'significant' ? -1 : 0); });
      if (gifts.length > 0 || nurture.length > 0) {
        paths = [
          { kind: 'timing', text: isSi ? 'සුබ මුහුර්තයකින් විවාහය අරඹන්න — හොඳ ආරම්භයක් හැම ගැළපීමකටම උදව්වක්.' : 'Pick an auspicious wedding time — a good start helps every match.' },
          { kind: 'understanding', text: isSi ? 'බලාගත යුතු තැන් ගැන කලින්ම එකට කතා කරගන්න — දැනුවත්කම ගැටුම සමීපකමට හරවනවා.' : 'Talk about the tender areas together, early — awareness turns friction into closeness.' },
        ];
      }
    }

    if (gifts.length === 0 && nurture.length === 0) return null;
    return { gifts: gifts, nurture: nurture, paths: paths };
  })();

  function strengthsCareChapter(ix) {
    var body = '';
    if (scContent.gifts.length > 0) {
      body += '<div class="pschead" style="color:#0E9F6E;margin-top:0;">' + esc(PT.scGifts) + '</div>';
      scContent.gifts.forEach(function (g) {
        body += '<div class="pscrow"><span class="pscmark" style="color:#0E9F6E;">✓</span>'
          + '<div><div class="pscarea">' + esc(g.area) + '</div><div class="psctext">' + esc(g.text) + '</div></div></div>';
      });
    }
    if (scContent.nurture.length > 0) {
      body += '<div class="pschead" style="color:#B08430;">' + esc(PT.scCare) + '</div>';
      scContent.nurture.forEach(function (n) {
        var serious = n.severity === 'significant';
        var inner = '<div class="pscrow" style="margin-bottom:0;"><span class="pscmark" style="color:' + (serious ? '#B45309' : '#B08430') + ';">' + (serious ? '!' : '•') + '</span>'
          + '<div>'
          + (serious ? '<div class="psctag">' + esc(PT.scSignificant) + '</div>' : '')
          + '<div class="pscarea">' + esc(n.area) + '</div><div class="psctext">' + esc(n.text) + '</div>'
          + (n.path ? '<div class="pscpath">' + esc(n.path) + '</div>' : '')
          + '</div></div>';
        body += serious ? '<div class="pscbox">' + inner + '</div>' : '<div style="margin-bottom:9px;">' + inner + '</div>';
      });
    }
    if (scContent.paths.length > 0) {
      body += '<div class="pschead" style="color:#8A6A20;">' + esc(PT.scPaths) + '</div>';
      scContent.paths.forEach(function (p) {
        body += '<div class="pscrow"><span class="pscmark" style="color:#8A6A20;">→</span>'
          + '<div class="psctext" style="margin-top:0;">' + esc(p.text) + '</div></div>';
      });
    }
    return chapterShell(ix, PT.scTitle, PT.scSub, '', body);
  }

  // ── 03 · The seven classical signals ───────────────────────────
  function signalsChapter(ix) {
    var body = factors.map(function (f, i) {
      var copy = pdfSignalCopy(f.name, isSi, f.score, f.maxScore);
      var pct = f.maxScore > 0 ? f.score / f.maxScore : 0;
      var c = copy.colors;
      return '<div class="psig"' + (i === 0 ? ' style="border-top:none;padding-top:2px;"' : '') + '>'
        + '<div class="psig-top"><div class="psig-names">'
        + '<div class="psig-name">' + esc(copy.plainName) + '</div>'
        + '<div class="psig-tech">' + esc(copy.techName) + '</div>'
        + '</div>'
        + chip(copy.tierLabel, c.text, c.line, c.soft)
        + '<span class="psig-score">' + f.score + '/' + f.maxScore + '</span>'
        + '</div>'
        + (copy.what ? '<div class="psig-what">' + esc(copy.what) + '</div>' : '')
        + '<div class="psig-track"><div class="psig-fill" style="width:' + Math.max(pct * 100, 3).toFixed(0) + '%;background:' + c.fill + ';"></div></div>'
        + (copy.insight ? '<div class="psig-insight">' + esc(copy.insight) + '</div>' : '')
        + '</div>';
    }).join('');
    body += '<div class="pnote">' + esc(PT.signalsNote) + '</div>';
    var right = data.totalScore != null
      ? chip(data.totalScore + '/' + (data.maxPossibleScore || 20), '#8A6A20', 'rgba(176,132,48,.4)', 'rgba(217,164,65,.09)')
      : '';
    return chapterShell(ix, PT.factors, PT.factorsSub, right, body, true);
  }

  // ── 04 · Attraction & closeness ────────────────────────────────
  var mag = data.magnetism;
  var hasMag = mag && mag.totalScore != null && mag.maxScore;
  var yoniFactor = factors.find(function (f) { return f.name === 'Yoni'; });
  var brideYoni = yoniFactor && yoniFactor.brideYoni;
  var groomYoni = yoniFactor && yoniFactor.groomYoni;

  function attractionChapter(ix) {
    var body = '';
    var magFactors = (hasMag && mag.factors) || [];
    magFactors.forEach(function (fac) {
      var meta = PDF_MAG_LABELS[fac.nameEn] || { en: fac.nameEn || fac.nameSi || 'Signal', si: fac.nameSi || fac.nameEn || 'සංඥාව' };
      var pct = fac.maxScore > 0 ? fac.score / fac.maxScore : 0;
      var t = tierFor(pct);
      body += '<div class="pmag">'
        + '<div class="pmag-label">' + esc(isSi ? meta.si : meta.en) + '</div>'
        + '<div class="pmag-bar"><div class="pmag-fill" style="width:' + Math.max(pct * 100, 4).toFixed(0) + '%;background:' + t.fill + ';"></div></div>'
        + '<div class="pmag-score" style="color:' + t.text + ';">' + fac.score + '/' + fac.maxScore + '</div>'
        + '</div>';
    });

    if (brideYoni && groomYoni) {
      var bm = PDF_YONI[brideYoni] || { si: brideYoni, trait: { en: '', si: '' } };
      var gm = PDF_YONI[groomYoni] || { si: groomYoni, trait: { en: '', si: '' } };
      var yoniScore = yoniFactor ? yoniFactor.score : 0;
      var yoniNarrative = yoniScore >= 3
        ? (isSi ? 'එකම ස්වභාවය — නොවෙහෙසී එකට ගැළපෙනවා.' : 'The same nature — effortlessly in tune.')
        : yoniScore >= 2
          ? (isSi ? 'මිත්‍ර ස්වභාවයන් — ස්වාභාවික ආකර්ෂණයක් තිබෙනවා.' : 'Friendly natures — you simply click.')
          : (isSi ? 'වෙනස් ස්වභාවයන් — හිතාමතා එකට කාලය ගත කිරීමෙන් සමීපත්වය වර්ධනය වෙනවා.' : 'Different natures — closeness grows with deliberate time together.');
      body += '<div class="pschead" style="color:#BE185D;margin-top:' + (magFactors.length > 0 ? '12px' : '0') + ';">' + esc(PT.naturesTitle) + '</div>'
        + '<div class="pnatures">'
        + '<div class="pnature"><div class="pnature-who">' + esc(brideName) + '</div>'
        + '<div class="pnature-name">' + esc(isSi ? bm.si : brideYoni) + '</div>'
        + '<div class="pnature-trait">' + esc(isSi ? bm.trait.si : bm.trait.en) + '</div></div>'
        + '<div class="pnature-mid">' + (yoniScore >= 2 ? '♥' : '♡') + '</div>'
        + '<div class="pnature"><div class="pnature-who">' + esc(groomName) + '</div>'
        + '<div class="pnature-name">' + esc(isSi ? gm.si : groomYoni) + '</div>'
        + '<div class="pnature-trait">' + esc(isSi ? gm.trait.si : gm.trait.en) + '</div></div>'
        + '</div>'
        + '<div class="pnarr">' + esc(yoniNarrative) + '</div>';
    }

    if (hasMag && mag.summary) {
      var summary = isSi ? (mag.summary.si || mag.summary.en) : (mag.summary.en || mag.summary.si);
      if (summary) body += '<div class="pnote">' + esc(summary) + '</div>';
    }

    var right = hasMag ? chip(mag.totalScore + '/' + mag.maxScore, '#BE185D', 'rgba(236,72,153,.4)', 'rgba(236,72,153,.08)') : '';
    return chapterShell(ix, PT.attractionTitle, PT.attractionSub, right, body);
  }

  // ── 05 · Life right now ────────────────────────────────────────
  var lifeRows = [];
  (function buildLifeNow() {
    var dc = adv && adv.dashaCompatibility;
    function dashaRow(person, name) {
      if (!person || !person.currentDasha) return;
      var benefic = person.isBeneficPeriod === true;
      var t = benefic ? PDF_TIERS.good : PDF_TIERS.mixed;
      lifeRows.push({
        colors: t,
        label: benefic ? (isSi ? 'හොඳ කාලයක්' : 'A good period') : (isSi ? 'ටිකක් බර කාලයක්' : 'A heavier period'),
        caption: isSi ? (PLANET_SI[person.currentDasha] || person.currentDasha) + ' මහදශාව' : person.currentDasha + ' major period',
        name: name,
      });
    }
    if (dc) {
      dashaRow(dc.bride, brideName);
      dashaRow(dc.groom, groomName);
    }
    if (jm && jm.brideSadeSati && jm.brideSadeSati.status) {
      lifeRows.push({ colors: PDF_TIERS.mixed, name: brideName, label: isSi ? 'තව බර කාලයක් ගෙවෙනවා' : 'Also in a heavier Saturn period', caption: isSi ? 'සාඩේ සති කාලය — කලකින් පහව යනවා' : 'Sade Sati — it passes with time' });
    }
    if (jm && jm.groomSadeSati && jm.groomSadeSati.status) {
      lifeRows.push({ colors: PDF_TIERS.mixed, name: groomName, label: isSi ? 'තව බර කාලයක් ගෙවෙනවා' : 'Also in a heavier Saturn period', caption: isSi ? 'සාඩේ සති කාලය — කලකින් පහව යනවා' : 'Sade Sati — it passes with time' });
    }
  })();

  function lifeNowChapter(ix) {
    var body = lifeRows.map(function (r, i) {
      return '<div class="pdeep"' + (i === 0 ? ' style="border-top:none;padding-top:2px;"' : '') + '>'
        + '<div class="pdeep-main"><div class="pdeep-title">' + esc(r.name) + '</div>'
        + '<div class="pdeep-cap">' + esc(r.caption) + '</div></div>'
        + chip(r.label, r.colors.text, r.colors.line, r.colors.soft)
        + '</div>';
    }).join('');
    var dc = adv && adv.dashaCompatibility;
    if (dc) {
      var harmony = dc.harmony;
      var harmonyText = harmony === 'harmonious'
        ? (isSi ? 'දෙදෙනා දැන් ගෙවන කාල එකිනෙකාට උදව් වෙනවා — එකට ලොකු තීරණ ගන්න හොඳ වෙලාවක්.' : 'The periods you are both in now help each other — a good time for big decisions together.')
        : harmony === 'conflicting'
          ? (isSi ? 'දැන් දෙදෙනා ගෙවන කාල දෙක වෙනස් රිද්මවල. ලොකු තීරණ හදිසියේ නොගෙන, කතා කර ඉවසීමෙන් ගන්න.' : 'Right now your two periods run on different rhythms. Don’t rush big decisions — talk them through patiently.')
          : (isSi ? 'කාල මිශ්‍රයි — ලොකු තීරණ හෙමින්, දෙදෙනාම එකඟ වී ගන්න.' : 'The timing is mixed — take big decisions slowly, and only together.');
      body += '<div class="pharmony">' + esc(harmonyText) + '</div>';
    }
    return chapterShell(ix, PT.lifeNowTitle, PT.lifeNowSub, '', body);
  }

  // ── 06 · The deeper bond ───────────────────────────────────────
  var deepRows = [];
  (function buildDeeperBond() {
    var nc = adv && adv.navamshaCompatibility;
    var mp = adv && adv.marriagePlanetStrength;
    var md = adv && adv.mangalaDosha;
    var jb = jm && jm.brideMangalDosha;
    var jg = jm && jm.groomMangalDosha;

    if (nc) {
      var nScore = nc.score || 0;
      var nMax = nc.maxScore || 8;
      var nT = tierFor(nMax > 0 ? nScore / nMax : 0);
      var nDesc = (isSi ? (nc.descriptionSi || (nc.insightsSi && nc.insightsSi[0])) : null)
        || nc.description || (nc.insights && nc.insights[0])
        || (isSi ? 'මතුපිට ලකුණුවලට අමතරව, විවාහ ජීවිතය ගැනම බලන ගැඹුරු ගැළපීමයි මේ.' : 'Beyond the surface points, this is the deeper match for married life itself.');
      deepRows.push({
        colors: nT, badge: nScore + '/' + nMax,
        title: isSi ? 'ඇතුළතම ගැළපීම' : 'Soul-level match',
        caption: isSi ? 'නවාංශක (D9) — විවාහ ජීවිතය ගැනම බලන කේන්දරය' : 'Navamsha (D9) — the chart that looks at married life itself',
        desc: nDesc,
      });
    }

    if (mp) {
      var mScore = mp.score || 0;
      var mMax = mp.maxScore || 3;
      var mPct = mMax > 0 ? mScore / mMax : 0;
      var mT = tierFor(mPct);
      var mLabel = mPct >= 0.7 ? (isSi ? 'ප්‍රබලයි' : 'Strong') : mPct >= 0.4 ? (isSi ? 'මධ්‍යමයි' : 'Steady') : (isSi ? 'මෘදුයි' : 'Gentle');
      var mDesc = (isSi ? mp.assessmentSi : null) || mp.assessment
        || (isSi ? 'ආදරයටත් කැපවීමටත් උදව් කරන ග්‍රහයෝ දෙදෙනාගේ කේන්දරවල කොතරම් ශක්තිමත්ද කියායි මේ බලන්නේ.' : 'This looks at how strong the planets of love and commitment are in both charts.');
      deepRows.push({
        colors: mT, badge: mLabel,
        title: isSi ? 'කැපවීමේ ශක්තිය' : 'Capacity for commitment',
        caption: isSi ? 'සිකුරු සහ 7 වැනි ගෙයි අධිපති — ආදරය පෙන්වන ග්‍රහයෝ' : 'Venus & the 7th-house lord — the love planets',
        desc: mDesc,
      });
    }

    // Mars balance — the honest, calm version; never alarm-red.
    var bHas = md && md.bride ? !!md.bride.hasDosha : (jb ? !!jb.hasDosha : null);
    var gHas = md && md.groom ? !!md.groom.hasDosha : (jg ? !!jg.hasDosha : null);
    var bCancelled = md && md.bride && md.bride.cancelled;
    var gCancelled = md && md.groom && md.groom.cancelled;
    if (bHas !== null || gHas !== null) {
      var bEff = bHas && !bCancelled;
      var gEff = gHas && !gCancelled;
      var marsTitle = isSi ? 'කුජ සමතුලිතය' : 'Mars balance';
      var marsCaption = isSi ? 'කුජ (මංගල) දෝෂ පරීක්ෂාව' : 'The mangal (Mars) check';
      if (!bEff && !gEff) {
        var wasCancelled = (bHas && bCancelled) || (gHas && gCancelled);
        deepRows.push({
          colors: PDF_TIERS.good, badge: isSi ? 'සමතුලිතයි' : 'Balanced', title: marsTitle, caption: marsCaption,
          desc: wasCancelled
            ? (isSi ? 'කුජ බලපෑමක් තිබුණත්, කේන්දරයේම වෙනත් හේතු නිසා එය නැති වී ඇති බවයි සම්ප්‍රදාය කියන්නේ.' : 'There is a Mars influence, but tradition reads it as cancelled out by other parts of the chart itself.')
            : (isSi ? 'දෙදෙනාගේම කුජ පිහිටීම සන්සුන්යි — මෙතැන බය වෙන්න දෙයක් නැහැ.' : 'Both Mars placements are calm — nothing to worry about here.'),
        });
      } else if (bEff && gEff) {
        deepRows.push({
          colors: PDF_TIERS.good, badge: isSi ? 'ගැළපී සමනයි' : 'Matched', title: marsTitle, caption: marsCaption,
          desc: isSi ? 'දෙදෙනා තුළම සමාන කුජ ශක්තියක් තිබෙනවා — සම්ප්‍රදායට අනුව එය එකිනෙක සමනය වෙනවා; ප්‍රශ්නයක් නොවේ.' : 'You both carry the same Mars energy — tradition reads this as balancing out. Not a problem.',
        });
      } else {
        var carrier = bEff ? brideName : groomName;
        deepRows.push({
          colors: PDF_TIERS.poor, badge: isSi ? 'සැලකිල්ල ඕනෑ' : 'Needs care', title: marsTitle, caption: marsCaption,
          desc: isSi
            ? carrier + 'ගේ කේන්දරයේ කුජ බලය තීව්‍රයි — තරහ ඉක්මනින් ආ හැකියි. ඉවසීමෙන් කතා කිරීම මෙතැන යතුරයි; බැරෑරුම් කියවීමකට පළපුරුදු ජ්‍යෝතිෂවේදියෙකු හමුවීම හොඳයි.'
            : carrier + '’s chart carries strong Mars energy — tempers can rise quickly. Patient talk is the key here; for a serious reading, meeting an experienced astrologer is wise.',
        });
      }
    }
  })();

  function deeperBondChapter(ix) {
    var body = deepRows.map(function (r, i) {
      return '<div class="pdeep"' + (i === 0 ? ' style="border-top:none;padding-top:2px;"' : '') + '>'
        + '<div class="pdeep-main"><div class="pdeep-title">' + esc(r.title) + '</div>'
        + '<div class="pdeep-cap">' + esc(r.caption) + '</div>'
        + '<div class="pdeep-desc">' + esc(r.desc) + '</div></div>'
        + chip(r.badge, r.colors.text, r.colors.line, r.colors.soft)
        + '</div>';
    }).join('');
    return chapterShell(ix, PT.deepTitle, PT.deepSub, '', body);
  }

  // ── 07 · Good wedding dates ────────────────────────────────────
  var weddingWindows = (adv && adv.weddingWindows && adv.weddingWindows.favorableWindows) || [];

  function weddingChapter(ix) {
    var body = weddingWindows.map(function (w, i) {
      var hasDate = w.end && w.end.length > 0;
      var isBest = w.best === true;
      var row = '<div class="pwed"' + (i === 0 ? ' style="border-top:none;padding-top:2px;"' : '') + '><div style="flex:1;">';
      if (hasDate) {
        row += '<div class="pwed-dates" style="color:' + (isBest ? '#0E9F6E' : 'var(--ink)') + ';">' + esc(w.start) + '  →  ' + esc(w.end)
          + (isBest ? '<span class="pbest">' + (isSi ? 'හොඳම' : 'BEST') + '</span>' : '') + '</div>';
      } else {
        row += '<div style="font-size:12px;color:#8A8095;">' + esc(isSi ? (w.startSi || PT.noWindows) : PT.noWindows) + '</div>';
      }
      var reason = isSi ? (w.reasonSi || w.reason) : w.reason;
      if (reason) row += '<div class="pwed-reason">' + esc(reason) + '</div>';
      if (w.durationDays > 0) row += '<div class="pwed-meta">' + w.durationDays + ' ' + (isSi ? 'දින' : 'days') + '</div>';
      row += '</div></div>';
      return row;
    }).join('');
    return chapterShell(ix, PT.weddingTitle, PT.weddingSub, '', body);
  }

  // ── 08 · Your birth stars ──────────────────────────────────────
  function birthStarsChapter(ix) {
    var bride = data.bride;
    var groom = data.groom;

    function pill(person, name, dotColor) {
      var sign = person.rashi ? (isSi ? person.rashi.sinhala : person.rashi.name) : '';
      var star = person.nakshatra ? (isSi ? person.nakshatra.sinhala : person.nakshatra.name) : '';
      var pada = person.nakshatra && person.nakshatra.pada ? (isSi ? ' · පාද ' + person.nakshatra.pada : ' · Pada ' + person.nakshatra.pada) : '';
      var lordName = person.nakshatra ? (isSi ? (PLANET_SI[person.nakshatra.lord] || person.nakshatra.lord) : person.nakshatra.lord) : '';
      return '<div class="ppill">'
        + '<div class="ppill-name" style="color:' + dotColor + ';">' + esc(name) + '</div>'
        + (sign ? '<div class="ppill-sign">' + esc(sign) + '</div>' : '')
        + (star ? '<div class="ppill-star">' + esc(star) + esc(pada) + '</div>' : '')
        + (lordName ? '<div class="ppill-lord">' + esc(isSi ? 'අධිපති ග්‍රහයා: ' : 'Ruled by ') + esc(lordName) + '</div>' : '')
        + '</div>';
    }

    var body = '<div class="ppills">' + pill(bride, brideName, '#BE185D') + pill(groom, groomName, '#1D4ED8') + '</div>';

    var be = data.brideEnhanced && data.brideEnhanced.tattvaBalance;
    var ge = data.groomEnhanced && data.groomEnhanced.tattvaBalance;
    if (be && ge && be.dominant && ge.dominant) {
      var bEl = PDF_ELEM[be.dominant] || PDF_ELEM.Fire;
      var gEl = PDF_ELEM[ge.dominant] || PDF_ELEM.Fire;
      var metaphor = PDF_ELEM_METAPHORS[be.dominant + '+' + ge.dominant] || PDF_ELEM_METAPHORS[ge.dominant + '+' + be.dominant]
        || { en: 'A rare elemental mix — a chemistry of its own.', si: 'දුර්ලභ මූලධාතු සංයෝගයක් — එයටම ආවේණික රසායනයක්.' };
      body += '<div class="pelems">'
        + '<div class="pelem"><div class="pelem-name" style="color:' + bEl.color + ';">' + esc(isSi ? bEl.si : be.dominant) + '</div><div class="pelem-who">' + esc(brideName) + '</div></div>'
        + '<div style="font-size:13px;color:#B08430;">✦</div>'
        + '<div class="pelem"><div class="pelem-name" style="color:' + gEl.color + ';">' + esc(isSi ? gEl.si : ge.dominant) + '</div><div class="pelem-who">' + esc(groomName) + '</div></div>'
        + '</div>'
        + '<div class="pmeta">' + esc(isSi ? metaphor.si : metaphor.en) + '</div>';
    }
    return chapterShell(ix, PT.starsTitle, PT.starsSub, '', body);
  }

  // ── 09 · For the curious ───────────────────────────────────────
  var bj = data.brideAdvanced && data.brideAdvanced.tier1 && data.brideAdvanced.tier1.jaimini;
  var gj = data.groomAdvanced && data.groomAdvanced.tier1 && data.groomAdvanced.tier1.jaimini;
  var bKey = bj && (typeof bj.atmakaraka === 'string' ? bj.atmakaraka : (bj.atmakaraka && bj.atmakaraka.planet));
  var gKey = gj && (typeof gj.atmakaraka === 'string' ? gj.atmakaraka : (gj.atmakaraka && gj.atmakaraka.planet));
  var bpl = data.brideAdvanced && data.brideAdvanced.tier3 && data.brideAdvanced.tier3.pastLife;
  var gpl = data.groomAdvanced && data.groomAdvanced.tier3 && data.groomAdvanced.tier3.pastLife;
  var hasDrives = !!(bKey && gKey);

  function pdfPastMeta(pl) {
    var themes = pl && (pl.ketuThemes || (pl.pastLife && pl.pastLife.ketuThemes));
    if (!themes || !themes.archetype) return null;
    var parts = String(themes.archetype).toLowerCase().split('/');
    for (var p = 0; p < parts.length; p++) {
      var key = parts[p].trim();
      if (PDF_PASTLIFE[key]) return PDF_PASTLIFE[key];
    }
    var name = parts[0] ? parts[0].trim() : '';
    if (!name) return null;
    return { en: name.charAt(0).toUpperCase() + name.slice(1), si: themes.archetypeSi ? String(themes.archetypeSi).split('/')[0].trim() : name };
  }

  var pastB = bpl && gpl ? pdfPastMeta(bpl) : null;
  var pastG = bpl && gpl ? pdfPastMeta(gpl) : null;
  var hasPast = !!(pastB && pastG);

  function curiousChapter(ix) {
    var body = '';
    if (hasDrives) {
      body += '<div class="pcurio-block" style="margin-top:0;">' + esc(isSi ? 'හදවතින්ම ඕනෑ දේ' : 'What each of you deeply wants') + '</div>';
      [{ key: bKey, name: brideName }, { key: gKey, name: groomName }].forEach(function (p, i) {
        var drive = PDF_PLANET_DRIVE[p.key] || { en: p.key, si: p.key };
        body += '<div class="psoul"' + (i === 0 ? ' style="border-top:none;"' : '') + '>'
          + '<div class="psoul-main"><div class="psoul-who">' + esc(p.name) + '</div>'
          + '<div class="psoul-drive">' + esc(isSi ? drive.si : drive.en) + '</div></div>'
          + '<div class="psoul-planet">' + esc(isSi ? (PLANET_SI[p.key] || p.key) : p.key) + '</div>'
          + '</div>';
      });
    }
    if (hasPast) {
      body += '<div class="pcurio-block">' + esc(isSi ? 'පෙර භව දෝංකාර' : 'Past-life echoes') + '</div>'
        + '<div class="pnatures">'
        + '<div class="pnature"><div class="pnature-who">' + esc(brideName) + '</div><div class="pnature-name">' + esc(isSi ? pastB.si : pastB.en) + '</div></div>'
        + '<div class="pnature-mid">∞</div>'
        + '<div class="pnature"><div class="pnature-who">' + esc(groomName) + '</div><div class="pnature-name">' + esc(isSi ? pastG.si : pastG.en) + '</div></div>'
        + '</div>'
        + '<div class="pmeta">' + esc(isSi
          ? pastB.si + ' කෙනෙක් සහ ' + pastG.si + ' කෙනෙක් — කලින් හඳුනනවා වගේ දැනෙන බැඳීමක්.'
          : 'A ' + pastB.en.toLowerCase() + ' and a ' + pastG.en.toLowerCase() + ' — a bond that feels like you already know each other.') + '</div>';
    }
    return chapterShell(ix, PT.curioTitle, PT.curioSub, '', body);
  }

  // ── Chapters render in reading order, numbered like a report ───
  var chapters = [];
  if (glanceRows.length > 0) chapters.push(glanceChapter);
  if (scContent) chapters.push(strengthsCareChapter);
  if (factors.length > 0) chapters.push(signalsChapter);
  if (hasMag || (brideYoni && groomYoni)) chapters.push(attractionChapter);
  if (lifeRows.length > 0) chapters.push(lifeNowChapter);
  if (deepRows.length > 0) chapters.push(deeperBondChapter);
  if (weddingWindows.length > 0) chapters.push(weddingChapter);
  if (data.bride && data.groom) chapters.push(birthStarsChapter);
  if (hasDrives || hasPast) chapters.push(curiousChapter);

  var chaptersHTML = chapters.map(function (renderChapter, i) {
    return renderChapter((i + 1 < 10 ? '0' : '') + (i + 1));
  }).join('');

  // ── The two birth charts ───────────────────────────────────────
  var chartsHTML = '';
  if ((data.brideChart && data.brideChart.rashiChart) || (data.groomChart && data.groomChart.rashiChart)) {
    var chartsBody = '<div style="display:flex;gap:16px;justify-content:center;align-items:flex-start;">';
    if (data.brideChart && data.brideChart.rashiChart) {
      chartsBody += '<div class="chart-wrap" style="flex:1;max-width:48%;margin:0;"><div class="chart-title" style="color:#BE185D;">' + esc(PT.brideChart) + '</div>'
        + svgSriLankanChart(data.brideChart.rashiChart, data.brideChart.lagnaRashiId, opts.lang, 240) + '</div>';
    }
    if (data.groomChart && data.groomChart.rashiChart) {
      chartsBody += '<div class="chart-wrap" style="flex:1;max-width:48%;margin:0;"><div class="chart-title" style="color:#1D4ED8;">' + esc(PT.groomChart) + '</div>'
        + svgSriLankanChart(data.groomChart.rashiChart, data.groomChart.lagnaRashiId, opts.lang, 240) + '</div>';
    }
    chartsBody += '</div>';
    // D9 (Navamsha) — the marriage charts, shown as a second row beneath D1.
    if ((data.brideChart && data.brideChart.navamshaChart) || (data.groomChart && data.groomChart.navamshaChart)) {
      var d9Label = isSi ? 'නවාංශකය (D9) — විවාහ ජීවිතයේ කේන්දරය' : 'Navamsha (D9) — the marriage chart';
      chartsBody += '<div style="text-align:center;margin-top:16px;font-size:11px;font-weight:700;color:#7C3AED;">' + esc(d9Label) + '</div>';
      chartsBody += '<div style="display:flex;gap:16px;justify-content:center;align-items:flex-start;margin-top:6px;">';
      if (data.brideChart && data.brideChart.navamshaChart) {
        chartsBody += '<div class="chart-wrap" style="flex:1;max-width:48%;margin:0;"><div class="chart-title" style="color:#BE185D;">' + esc(PT.brideChart) + '</div>'
          + svgSriLankanChart(data.brideChart.navamshaChart, data.brideChart.navamshaLagnaId || data.brideChart.lagnaRashiId, opts.lang, 240) + '</div>';
      }
      if (data.groomChart && data.groomChart.navamshaChart) {
        chartsBody += '<div class="chart-wrap" style="flex:1;max-width:48%;margin:0;"><div class="chart-title" style="color:#1D4ED8;">' + esc(PT.groomChart) + '</div>'
          + svgSriLankanChart(data.groomChart.navamshaChart, data.groomChart.navamshaLagnaId || data.groomChart.lagnaRashiId, opts.lang, 240) + '</div>';
      }
      chartsBody += '</div>';
    }
    chartsHTML = chapterShell('', PT.chartsTitle, '', '', chartsBody);
  }

  // ── The written reading — a chaptered reader, not a wall of text
  var readerHTML = '';
  if (opts.report && typeof opts.report === 'string') {
    var names = [opts.brideName, opts.groomName].filter(Boolean).join(isSi ? ' සහ ' : ' & ');
    var parsed = pdfSplitReportSections(opts.report);
    var words = String(opts.report).trim().split(/\s+/).length;
    var mins = Math.max(1, Math.round(words / 170));

    var readerBody = '<div class="preader-cover">'
      + '<div class="preader-kicker">' + esc(PT.report) + '</div>'
      + (names ? '<div class="preader-names">' + esc(names) + '</div>' : '')
      + '<div class="preader-meta">'
      + (parsed ? '<span class="preader-chip">' + parsed.sections.length + ' ' + esc(PT.readerChapters) + '</span>' : '')
      + '<span class="preader-chip">~' + mins + ' ' + esc(PT.readerMin) + '</span>'
      + '</div>'
      + '<div class="preader-hint">' + esc(PT.readerSub) + '</div>'
      + '</div>';

    if (!parsed) {
      readerBody += '<div class="prose">' + markdownToHTML(opts.report) + '</div>';
    } else {
      if (parsed.intro) readerBody += '<div class="prose" style="margin-bottom:12px;">' + markdownToHTML(parsed.intro) + '</div>';
      parsed.sections.forEach(function (s) {
        readerBody += '<div class="prchap">'
          + '<div class="prchap-head"><span class="prchap-glyph">' + (s.glyph ? esc(s.glyph) : '✦') + '</span>'
          + '<span class="prchap-title">' + esc(s.title) + '</span></div>'
          + '<div class="prchap-body prose">' + markdownToHTML(s.body) + '</div>'
          + '</div>';
      });
    }
    readerHTML = '<div class="pchap pflow">' + readerBody + '</div>';
  }

  // ── Method + guidance footer — the quiet trust anchor ──────────
  var methodHTML = '<div class="pmethod">'
    + '<div class="pmethod-title">' + esc(PT.methodTitle) + '</div>'
    + '<div class="pmethod-body">' + esc(PT.methodBody) + '</div>'
    + '<div class="pguidance">' + esc(PT.guidanceNote) + '</div>'
    + '</div>';

  // ── End page ───────────────────────────────────────────────────
  var pEndLogoTag = opts.logoBase64
    ? '<div style="width:64px;height:64px;border-radius:16px;background:#160B22 url(data:image/png;base64,' + opts.logoBase64 + ') center/cover no-repeat;box-shadow:0 18px 54px rgba(0,0,0,.35);position:relative;z-index:1;"></div>'
    : '<div class="ep-icon">💍</div>';
  var endHTML = '<div class="ep ep-porondam">'
    + pEndLogoTag + '<div class="ep-brand" style="margin-top:12px;">ග්‍රහචාර</div><div class="ep-line"></div>'
    + '<div class="ep-tag">' + (isSi ? 'ඔබේ ජීවිතයේ තරු බලන්න' : 'Read the Stars of Your Life') + '</div>'
    + '<div class="ep-cta">' + (isSi ? '📱 යෙදුම බාගන්න' : '📱 Download the App') + '</div>'
    + '<div class="ep-features"><span class="ep-feat">🔮 ' + (isSi ? 'සතිපතා නැකැත්' : 'Weekly Nakath') + '</span>'
    + '<span class="ep-feat">📊 ' + (isSi ? 'සම්පූර්ණ වාර්තා' : 'Full Reports') + '</span>'
    + '<span class="ep-feat">💬 ' + (isSi ? 'AI ජ්‍යෝතිෂ chat' : 'AI Astro Chat') + '</span></div>'
    + '<div class="ep-url">www.grahachara.com</div>'
    + '<div class="ep-disc">' + (isSi
      ? 'මේ වාර්තාව සාම්ප්‍රදායික ජ්‍යෝතිෂ ශාස්ත්‍රය මත පදනම් වෙනවා. මේක දැනගැනීම් සඳහා පමණි.'
      : 'This report is for informational and reflective guidance only.') + '</div></div>';

  var pHeaderLogoTag = opts.logoBase64
    ? '<span style="display:inline-block;width:18px;height:18px;border-radius:4px;background:url(data:image/png;base64,' + opts.logoBase64 + ') center/cover no-repeat;margin-right:6px;vertical-align:middle;"></span>'
    : '';

  return '<!DOCTYPE html><html lang="' + (isSi ? 'si' : 'en') + '"><head>'
    + '<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>'
    + '<title>' + (isSi ? 'ග්‍රහචාර පොරොන්දම් ගැළපීම' : 'Grahachara Marriage Match') + '</title>'
    + '<style>' + sharedCSS('pink') + porondamPrintCSS() + '</style></head><body>'
    + '<div class="wm">ග්‍රහචාර</div>'
    + '<div class="oc oc-tl"></div><div class="oc oc-tr"></div><div class="oc oc-bl"></div><div class="oc oc-br"></div>'
    + '<div class="ph"><span class="lm" style="color:#EC4899;">' + pHeaderLogoTag + 'ග්‍රහචාර</span><span>' + esc(PT.headerTag) + '</span></div>'
    + '<div class="pf">ග්‍රහචාර &bull; www.grahachara.com &bull; ' + new Date().toLocaleDateString() + '</div>'
    + coverHTML
    // Charts come right after the verdict, before the chapters — the
    // traditional order, matching the results screen.
    + '<div class="cp">' + heroHTML + chartsHTML + chaptersHTML + readerHTML + methodHTML + '</div>'
    + endHTML + '</body></html>';
}

module.exports = { generateReportHTML, generatePorondamHTML, loadLogoBase64, SECTION_COLORS };
