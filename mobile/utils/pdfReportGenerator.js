/**
 * Spectacular PDF Report & Porondam Generator — ග්‍රහචාර
 * 
 * Premium branded HTML → PDF engine with:
 * ─ Full-bleed gradient cover page with zodiac ring
 * ─ Inline SVG Sri Lankan Rashi Kendara charts
 * ─ Circular SVG score gauges with colour coding
 * ─ Section verdict banners (strength bars + emoji rating)
 * ─ Table of contents with coloured dots
 * ─ Birth-data card with Nakshatra/Lagna detail
 * ─ Ornamental corner borders + diagonal watermark
 * ─ Branded header/footer on every page
 * ─ Marketing end-page with app CTA
 * ─ Porondam: mirrors the in-app report — verdict-first archetype hero,
 *   numbered plain-language chapters, dual charts, chaptered written
 *   reading, method + guidance footer
 * 
 * Exports:
 *   generateReportHTML(opts)  – Full Life Report PDF
 *   generatePorondamHTML(opts) – Marriage Compatibility PDF
 *   loadLogoBase64()          – Load app logo as base64 for PDF embedding
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
  _logoBase64Cache = APP_LOGO_BASE64;
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

function legacySharedCSS(accentHue) {
  var ac = accentHue === 'pink'
    ? { h:'#EC4899',bg1:'#831843',bg2:'#BE185D',bg3:'#EC4899',bg4:'#F9A8D4',wa:'rgba(236,72,153,0.03)',co:'rgba(236,72,153,0.12)',hc:'rgba(236,72,153,0.5)',fc:'rgba(236,72,153,0.3)',fb:'rgba(236,72,153,0.06)' }
    : { h:'#7C3AED',bg1:'#1E1B4B',bg2:'#312E81',bg3:'#4C1D95',bg4:'#7C3AED',wa:'rgba(124,58,237,0.03)',co:'rgba(124,58,237,0.12)',hc:'rgba(124,58,237,0.5)',fc:'rgba(124,58,237,0.4)',fb:'rgba(124,58,237,0.06)' };

  return ''
    // NOTE: external @import of Google Fonts removed — it caused
    // ExpoPrint.printToFileAsync to reject on Android when the network was
    // unavailable or slow at print time. System fonts (Roboto on Android,
    // San Francisco on iOS) cover Latin; Noto Sans Sinhala ships as a
    // system font on Android API 23+ and iOS 13+, so Sinhala renders
    // correctly without a remote fetch.
    +':root{--ac:'+ac.h+';--gold:#FBBF24;--gold-l:#FDE68A;--txt:#1F2937;}'
    +'@page{margin:0;size:A4;}*{box-sizing:border-box;margin:0;padding:0;}'
    +'body{font-family:-apple-system,"Roboto","Noto Sans Sinhala","Iskoola Pota",sans-serif;color:var(--txt);line-height:1.7;font-size:13px;background:#fff;}'
    // Watermark
    +'.wm{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);font-size:90px;font-weight:900;color:'+ac.wa+';letter-spacing:16px;white-space:nowrap;z-index:0;pointer-events:none;user-select:none;}'
    // Corners
    +'.oc{position:fixed;width:50px;height:50px;z-index:5;}'
    +'.oc-tl{top:6px;left:6px;border-top:2px solid '+ac.co+';border-left:2px solid '+ac.co+';}'
    +'.oc-tr{top:6px;right:6px;border-top:2px solid '+ac.co+';border-right:2px solid '+ac.co+';}'
    +'.oc-bl{bottom:6px;left:6px;border-bottom:2px solid '+ac.co+';border-left:2px solid '+ac.co+';}'
    +'.oc-br{bottom:6px;right:6px;border-bottom:2px solid '+ac.co+';border-right:2px solid '+ac.co+';}'
    // Header/Footer
    +'.ph{position:fixed;top:0;left:0;right:0;height:36px;display:flex;align-items:center;justify-content:space-between;padding:0 40px;font-size:8px;color:'+ac.hc+';letter-spacing:2px;text-transform:uppercase;border-bottom:1px solid '+ac.fb+';z-index:10;}'
    +'.ph .lm{font-weight:800;color:var(--ac);font-size:9px;}'
    +'.pf{position:fixed;bottom:0;left:0;right:0;height:32px;display:flex;align-items:center;justify-content:center;font-size:7px;color:'+ac.fc+';letter-spacing:1.5px;border-top:1px solid '+ac.fb+';}'
    // Cover
    +'.cover{width:100%;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,'+ac.bg1+' 0%,'+ac.bg2+' 25%,'+ac.bg3+' 50%,'+ac.bg4+' 75%,#9333EA 100%);color:#fff;position:relative;overflow:hidden;page-break-after:always;}'
    +'.cover::before{content:"";position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(ellipse at 30% 50%,rgba(251,191,36,0.15) 0%,transparent 50%),radial-gradient(ellipse at 70% 30%,rgba(255,255,255,0.06) 0%,transparent 50%);}'
    +'.zr{position:absolute;width:500px;height:500px;border:2px solid rgba(251,191,36,0.12);border-radius:50%;top:50%;left:50%;transform:translate(-50%,-50%);}'
    +'.zri{position:absolute;width:400px;height:400px;border:1px solid rgba(255,255,255,0.06);border-radius:50%;top:50%;left:50%;transform:translate(-50%,-50%);}'
    +'.zs{position:absolute;width:100%;height:100%;top:0;left:0;}.zs span{position:absolute;font-size:18px;color:rgba(251,191,36,0.2);}'
    +'.cc{position:relative;z-index:2;text-align:center;padding:40px;}'
    +'.cl{width:100px;height:100px;border-radius:28px;overflow:hidden;margin:0 auto 24px;border:3px solid rgba(251,191,36,0.5);box-shadow:0 0 60px rgba(251,191,36,0.3);display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.3);}'
    +'.cl img{width:100%;height:100%;object-fit:cover;}'
    +'.cb{font-size:14px;font-weight:700;color:rgba(251,191,36,0.9);letter-spacing:8px;text-transform:uppercase;margin-bottom:8px;}'
    +'.ct{font-size:36px;font-weight:900;line-height:1.2;margin-bottom:6px;text-shadow:0 2px 20px rgba(0,0,0,0.3);}'
    +'.ctg{background:linear-gradient(135deg,#FBBF24 0%,#F59E0B 50%,#FDE68A 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}'
    +'.cs{font-size:16px;color:rgba(255,255,255,0.7);margin-bottom:40px;font-weight:300;}'
    +'.cd{width:120px;height:2px;background:linear-gradient(90deg,transparent,rgba(251,191,36,0.6),transparent);margin:0 auto 32px;}'
    +'.cn{font-size:28px;font-weight:800;color:#FDE68A;margin-bottom:12px;text-shadow:0 0 30px rgba(251,191,36,0.4);}'
    +'.cdt{font-size:13px;color:rgba(255,255,255,0.55);line-height:1.9;}.cdt strong{color:rgba(255,255,255,0.85);}'
    +'.cfb{position:absolute;bottom:30px;left:0;right:0;text-align:center;font-size:9px;color:rgba(255,255,255,0.25);letter-spacing:3px;text-transform:uppercase;}'
    // Content page
    +'.cp{padding:52px 48px 44px;position:relative;}'
    // Score gauge
    +'.sg{display:inline-flex;align-items:center;justify-content:center;position:relative;}'
    +'.sg-txt{position:absolute;text-align:center;}'
    +'.sg-val{font-weight:900;line-height:1;}'
    +'.sg-lbl{font-size:10px;color:#6B7280;margin-top:2px;}'
    // Verdict banner
    +'.verdict{border-radius:14px;padding:18px 22px;margin-bottom:16px;position:relative;overflow:hidden;}'
    +'.verdict-hdr{display:flex;align-items:center;gap:10px;margin-bottom:8px;}'
    +'.verdict-emoji{font-size:28px;}'
    +'.verdict-title{font-size:13px;font-weight:700;color:#fff;flex:1;}'
    +'.verdict-score{font-size:24px;font-weight:900;color:#fff;}'
    +'.verdict-bar-wrap{height:6px;background:rgba(255,255,255,0.25);border-radius:3px;overflow:hidden;}'
    +'.verdict-bar{height:6px;border-radius:3px;background:rgba(255,255,255,0.9);}'
    +'.verdict-rating{display:inline-block;margin-top:8px;padding:3px 12px;border-radius:20px;background:rgba(255,255,255,0.2);color:#fff;font-size:10px;font-weight:700;letter-spacing:1px;}'
    // Report section
    +'.rs{page-break-inside:avoid;margin-bottom:28px;border-radius:12px;overflow:hidden;border:1px solid rgba(0,0,0,0.06);}'
    +'.rs-hdr{padding:14px 20px;display:flex;align-items:center;gap:10px;}'
    +'.rs-hdr .sn{width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.3);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;}'
    +'.rs-hdr .se{font-size:20px;}'
    +'.rs-hdr h2{flex:1;font-size:15px;font-weight:800;color:#fff;margin:0;text-shadow:0 1px 3px rgba(0,0,0,0.2);}'
    +'.rs-hdr .ss{font-size:13px;font-weight:900;color:#fff;background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:12px;}'
    +'.rs-body{padding:18px 22px;font-size:12.5px;line-height:1.85;color:#374151;}'
    +'.rs-body strong{color:#1F2937;}.rs-body em{color:var(--ac);font-style:italic;}'
    +'.rs-body blockquote{margin:10px 0;padding:10px 16px;border-left:3px solid var(--gold);background:rgba(251,191,36,0.06);border-radius:0 8px 8px 0;font-style:italic;color:#555;}'
    // Chart
    +'.chart-wrap{text-align:center;margin:24px auto;padding:20px;background:linear-gradient(135deg,#F5F3FF,#FEF3C7,#F5F3FF);border:1px solid rgba(124,58,237,0.12);border-radius:16px;page-break-inside:avoid;max-width:460px;overflow:visible;}'
    +'.chart-title{font-size:14px;font-weight:800;color:var(--ac);letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;}'
    // TOC
    +'.toc{page-break-after:always;}'
    +'.toc-hdr{text-align:center;margin-bottom:32px;padding-top:20px;}'
    +'.toc-hdr h2{font-size:22px;font-weight:800;color:var(--ac);letter-spacing:3px;text-transform:uppercase;}'
    +'.toc-line{width:60px;height:3px;background:linear-gradient(90deg,var(--gold),var(--ac));margin:10px auto 0;border-radius:2px;}'
    +'.toc-list{list-style:none;padding:0 20px;}'
    +'.toc-item{display:flex;align-items:center;padding:10px 0;border-bottom:1px dotted rgba(0,0,0,0.06);gap:12px;}'
    +'.toc-item:last-child{border-bottom:none;}'
    +'.toc-num{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0;}'
    +'.toc-emoji{font-size:16px;width:24px;text-align:center;flex-shrink:0;}'
    +'.toc-label{flex:1;font-size:13px;font-weight:600;color:#333;}'
    // Birth card
    +'.bc{background:linear-gradient(135deg,#F5F3FF 0%,#FEF3C7 50%,#F5F3FF 100%);border:1px solid rgba(124,58,237,0.15);border-radius:16px;padding:24px 28px;margin-bottom:32px;position:relative;overflow:hidden;}'
    +'.bc::after{content:"☸";position:absolute;top:-10px;right:-10px;font-size:100px;color:rgba(124,58,237,0.03);pointer-events:none;}'
    +'.bc h3{font-size:15px;font-weight:800;color:var(--ac);margin-bottom:14px;letter-spacing:1px;text-transform:uppercase;}'
    +'.bt{width:100%;border-collapse:collapse;}'
    +'.bt td{padding:7px 10px;font-size:12px;vertical-align:top;}'
    +'.bt tr:nth-child(odd) td{background:rgba(124,58,237,0.03);}'
    +'.bt .bl{color:var(--ac);font-weight:700;width:140px;white-space:nowrap;}'
    +'.bt .bv{color:#333;font-weight:500;}'
    // Hero scores page
    +'.hero-scores{page-break-after:always;padding:52px 48px;}'
    +'.hero-title{text-align:center;font-size:20px;font-weight:900;color:var(--ac);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;}'
    +'.hero-sub{text-align:center;font-size:12px;color:#888;margin-bottom:28px;}'
    +'.hero-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:28px;}'
    +'.hero-cell{text-align:center;padding:14px 8px;border-radius:14px;border:1px solid rgba(0,0,0,0.06);}'
    +'.hero-cell .hc-emoji{font-size:24px;margin-bottom:4px;}'
    +'.hero-cell .hc-name{font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;}'
    +'.hero-cell .hc-score{font-size:28px;font-weight:900;line-height:1;}'
    +'.hero-cell .hc-bar{height:4px;background:rgba(0,0,0,0.06);border-radius:2px;margin-top:8px;overflow:hidden;}'
    +'.hero-cell .hc-fill{height:4px;border-radius:2px;}'
    +'.hero-overall{text-align:center;padding:28px;background:linear-gradient(135deg,#F5F3FF,#FEF3C7,#F5F3FF);border-radius:20px;border:1px solid rgba(124,58,237,0.12);}'
    +'.hero-overall .ho-label{font-size:16px;font-weight:700;color:#555;margin-top:4px;}'
    +'.hero-overall .ho-sub{font-size:11px;color:#999;margin-top:4px;}'
    // End page
    +'.ep{width:100%;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,'+ac.bg1+','+ac.bg3+','+ac.bg4+');color:#fff;text-align:center;page-break-before:always;}'
    +'.ep .ep-icon{font-size:48px;margin-bottom:8px;}'
    +'.ep .ep-brand{font-size:11px;letter-spacing:6px;color:rgba(251,191,36,0.7);text-transform:uppercase;font-weight:700;}'
    +'.ep .ep-line{width:80px;height:2px;background:linear-gradient(90deg,transparent,rgba(251,191,36,0.5),transparent);margin:20px auto;}'
    +'.ep .ep-tag{font-size:14px;color:rgba(255,255,255,0.5);font-style:italic;}'
    +'.ep .ep-url{font-size:10px;color:rgba(255,255,255,0.3);letter-spacing:2px;margin-top:20px;}'
    +'.ep .ep-disc{max-width:400px;font-size:8px;color:rgba(255,255,255,0.2);line-height:1.6;margin-top:30px;}'
    +'.ep .ep-cta{margin-top:24px;padding:10px 24px;border:1px solid rgba(251,191,36,0.4);border-radius:10px;color:var(--gold);font-weight:700;font-size:11px;letter-spacing:1px;text-transform:uppercase;}'
    +'.ep .ep-features{display:flex;gap:16px;margin-top:16px;}'
    +'.ep .ep-feat{font-size:9px;color:rgba(255,255,255,0.35);}'
    +'@media print{.cover{page-break-after:always;}.toc{page-break-after:always;}.rs{page-break-inside:avoid;}.ep{page-break-before:always;}}';
}

// ════════════════════════════════════════════════
// SVG SCORE GAUGE
// ════════════════════════════════════════════════
function svgScoreGauge(score, size, color, label) {
  if (score == null || isNaN(score)) return '';
  var r = (size - 8) / 2;
  var circ = 2 * Math.PI * r;
  var pct = Math.min(100, Math.max(0, score));
  var dash = (pct / 100) * circ;
  var gap = circ - dash;
  var sc = color || (pct >= 75 ? '#10B981' : pct >= 55 ? '#3B82F6' : pct >= 35 ? '#F59E0B' : '#EF4444');
  var emoji = pct >= 80 ? '🔥' : pct >= 60 ? '✨' : pct >= 40 ? '💫' : '⚡';

  return '<div class="sg" style="width:'+size+'px;height:'+size+'px;">'
    +'<svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'">'
    +'<circle cx="'+(size/2)+'" cy="'+(size/2)+'" r="'+r+'" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="4"/>'
    +'<circle cx="'+(size/2)+'" cy="'+(size/2)+'" r="'+r+'" fill="none" stroke="'+sc+'" stroke-width="4" stroke-linecap="round" stroke-dasharray="'+dash.toFixed(1)+' '+gap.toFixed(1)+'" transform="rotate(-90 '+(size/2)+' '+(size/2)+')"/>'
    +'</svg>'
    +'<div class="sg-txt">'
    +'<div class="sg-val" style="font-size:'+Math.round(size*0.28)+'px;color:'+sc+';">'+pct+'</div>'
    +(label ? '<div class="sg-lbl">'+label+'</div>' : '<div class="sg-lbl">'+emoji+'</div>')
    +'</div></div>';
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
// SVG NAVAMSHA (D9) CHART
// ════════════════════════════════════════════════
function svgNavamshaChart(navamshaHouses, navamshaLagna, lang, size) {
  if (!navamshaHouses || !Array.isArray(navamshaHouses)) return '';
  var S = size || 280;
  var C = S / 3;
  var isSi = lang === 'si';

  // Get Navamsha lagna rashiId
  var navLagnaId = navamshaLagna?.rashiId || navamshaLagna?.rashi?.id || 1;

  // Build planet map by rashiId for Navamsha
  var rashiData = {};
  for (var i = 1; i <= 12; i++) rashiData[i] = { planets: [], hasLagna: i === navLagnaId };
  
  // Process navamsha houses array - planets are stored by their navamsha rashi
  navamshaHouses.forEach(function(house) {
    var rid = house.rashiId;
    if (rid && rashiData[rid] && house.planets) {
      house.planets.forEach(function(p) {
        var pName = typeof p === 'string' ? p : (p.name || '');
        if (pName === 'Lagna' || pName === 'Ascendant') {
          rashiData[rid].hasLagna = true;
        } else if (pName) {
          rashiData[rid].planets.push(typeof p === 'string' ? { name: p } : p);
        }
      });
    }
  });

  // Convert rashiId to house number based on Navamsha Lagna
  var rashiForHouse = function(h) { return ((navLagnaId - 1 + (h - 1)) % 12) + 1; };

  function planetText(houseNum, x, y) {
    var rid = rashiForHouse(houseNum);
    var d = rashiData[rid];
    if (!d || d.planets.length === 0) return '';
    var lines = '';
    d.planets.forEach(function(p, idx) {
      var pName = p.name || '';
      var lbl = isSi ? (PLANET_SI[pName] || pName.substring(0,2)) : (PLANET_SHORT[pName] || pName.substring(0,2));
      var col = PLANET_COLORS[pName] || '#666';
      lines += '<text x="'+x+'" y="'+(y + idx*11)+'" fill="'+col+'" font-size="8" font-weight="700" text-anchor="middle">'+lbl+'</text>';
    });
    return lines;
  }

  function hLabel(num, x, y) {
    return '<text x="'+x+'" y="'+y+'" fill="rgba(236,72,153,0.35)" font-size="7" font-weight="600" text-anchor="middle">'+num+'</text>';
  }

  function lagnaM(houseNum, x, y) {
    var rid = rashiForHouse(houseNum);
    if (!rashiData[rid].hasLagna) return '';
    return '<text x="'+x+'" y="'+y+'" fill="#EAB308" font-size="9" font-weight="900" text-anchor="middle">ல</text>';
  }

  // Navamsha uses pink/rose tones to differentiate from D1
  var svg = '<svg width="'+S+'" height="'+S+'" viewBox="0 0 '+S+' '+S+'" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;display:block;margin:0 auto;">'
    +'<rect width="'+S+'" height="'+S+'" fill="#fdf2f8" rx="8"/>'
    +'<rect x="0.5" y="0.5" width="'+(S-1)+'" height="'+(S-1)+'" fill="none" stroke="rgba(236,72,153,0.5)" stroke-width="1.5" rx="8"/>'
    +'<line x1="'+C+'" y1="0" x2="'+C+'" y2="'+S+'" stroke="rgba(236,72,153,0.4)" stroke-width="1"/>'
    +'<line x1="'+(2*C)+'" y1="0" x2="'+(2*C)+'" y2="'+S+'" stroke="rgba(236,72,153,0.4)" stroke-width="1"/>'
    +'<line x1="0" y1="'+C+'" x2="'+S+'" y2="'+C+'" stroke="rgba(236,72,153,0.4)" stroke-width="1"/>'
    +'<line x1="0" y1="'+(2*C)+'" x2="'+S+'" y2="'+(2*C)+'" stroke="rgba(236,72,153,0.4)" stroke-width="1"/>'
    // Corner diagonals
    +'<line x1="0" y1="'+C+'" x2="'+C+'" y2="0" stroke="rgba(236,72,153,0.3)" stroke-width="0.8"/>'
    +'<line x1="'+(2*C)+'" y1="0" x2="'+(3*C)+'" y2="'+C+'" stroke="rgba(236,72,153,0.3)" stroke-width="0.8"/>'
    +'<line x1="0" y1="'+(2*C)+'" x2="'+C+'" y2="'+(3*C)+'" stroke="rgba(236,72,153,0.3)" stroke-width="0.8"/>'
    +'<line x1="'+(2*C)+'" y1="'+(3*C)+'" x2="'+(3*C)+'" y2="'+(2*C)+'" stroke="rgba(236,72,153,0.3)" stroke-width="0.8"/>';

  // House contents - same layout as D1 but with Navamsha data
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
function zodiacRingHTML() {
  var html = '';
  ZODIAC_SYMBOLS.forEach(function(sym, i) {
    var angle = (i / 12) * 360;
    var rad = angle * Math.PI / 180;
    var cx = 50 + Math.cos(rad) * 42;
    var cy = 50 + Math.sin(rad) * 42;
    html += '<span style="left:'+cx+'%;top:'+cy+'%;">'+sym+'</span>';
  });
  return html;
}

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

function scoreVerdict(score, isSi) {
  if (score >= 80) return isSi ? '🔥 ඉතා ප්‍රබල' : '🔥 Excellent';
  if (score >= 60) return isSi ? '✨ ප්‍රබල' : '✨ Strong';
  if (score >= 40) return isSi ? '💫 සාමාන්‍ය' : '💫 Moderate';
  return isSi ? '⚡ දුර්වල' : '⚡ Needs Attention';
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

    if (trimmed.indexOf('> ') === 0) {
      flushParagraph();
      html.push('<blockquote>' + inlineMarkdown(trimmed.slice(2)) + '</blockquote>');
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
// ███ REPORT PDF ███
// ═══════════════════════════════════════════════════════════════
function generateReportHTML(opts) {
  var isSi = opts.lang === 'si';
  var sectionKeys = opts.sectionKeys || [];
  var sectionTitles = sectionKeys.map(function(key, i) { return opts.sectionTitles ? opts.sectionTitles[i] : key; });
  var narrativeSections = (opts.aiReport && opts.aiReport.narrativeSections) || {};
  var rawSections = (opts.aiReport && opts.aiReport.rawSections) || {};
  var reportSections = (opts.report && opts.report.sections) || {};
  var bd = (opts.report && opts.report.birthData) || opts.birthData || {};

  var logoTag = opts.logoBase64 ? '<img src="data:image/png;base64,'+opts.logoBase64+'"/>' : '<div style="font-size:44px;">🔮</div>';

  // Cover
  var coverHTML = '<div class="cover cover-report">'
    +'<div class="zr"></div><div class="zri"></div><div class="zs">'+zodiacRingHTML()+'</div>'
    +'<div class="cc"><div class="cl">'+logoTag+'</div>'
    +'<div class="cb">ග්‍රහචාර</div>'
    +'<div class="ct"><span class="ctg">'+(isSi?'සම්පූර්ණ ජීවිත වාර්තාව':'Complete Life Report')+'</span></div>'
    +'<div class="cs">'+(isSi?'ප්‍රායෝගික ජීවිත මගපෙන්වීම':'Practical Life Guidance')+'</div>'
    +'<div class="cd"></div>'
    +'<div class="cn">'+(opts.userName||(isSi?'ඔබ':'You'))+'</div>'
    +'<div class="cdt">'
    +(opts.birthLocation?'<strong>'+(isSi?'ස්ථානය':'Location')+':</strong> '+opts.birthLocation+'<br/>':'')
    +(opts.birthDate?'<strong>'+(isSi?'උපන් දිනය':'Born')+':</strong> '+opts.birthDate+(opts.birthTime?' &bull; '+opts.birthTime:'')+'<br/>':'')
    +(opts.lagnaLabel?'<strong>'+(isSi?'ජීවිත දිශාව':'Life Direction')+':</strong> '+opts.lagnaLabel+'<br/>':'')
    +(opts.nakshatraLabel?'<strong>'+(isSi?'උපන් අවධානය':'Birth Focus')+':</strong> '+opts.nakshatraLabel:'')
    +'</div></div>'
    +'<div class="cfb">'+(isSi?'පුද්ගලික ජීවිත කියවීම':'Personal Life Reading')+' &bull; '+new Date().toLocaleDateString()+'</div></div>';

  // TOC
  var tocItems = '';
  sectionKeys.forEach(function(key,i) {
    var sc2 = SECTION_COLORS[key] || { primary:'#7C3AED', emoji:'📋' };
    if (!narrativeSections[key]?.narrative) return;
    tocItems += '<li class="toc-item"><span class="toc-num" style="background:'+sc2.primary+';">'+(i+1)+'</span><span class="toc-emoji">'+sc2.emoji+'</span><span class="toc-label">'+(sectionTitles[i]||key)+'</span></li>';
  });
  var tocHTML = '<div class="toc cp"><div class="toc-hdr"><h2>'+(isSi?'අන්තර්ගතය':'Contents')+'</h2><div class="toc-line"></div></div><ul class="toc-list">'+tocItems+'</ul></div>';

  // Birth card
  var bRows = '';
  function addR(l,v){if(v)bRows+='<tr><td class="bl">'+l+'</td><td class="bv">'+v+'</td></tr>';}
  addR(isSi?'නම':'Name',opts.userName);
  addR(isSi?'උපන් ස්ථානය':'Birthplace',opts.birthLocation);
  addR(isSi?'උපන් දිනය සහ වෙනවාලාව':'Date & Time',(opts.birthDate||'')+' '+(opts.birthTime||''));
  addR(isSi?'ජීවිත දිශාව':'Life Direction',opts.lagnaLabel);
  addR(isSi?'උපන් අවධානය':'Birth Focus',opts.nakshatraLabel);
  addR(isSi?'චන්ද්‍ර ශක්තිය':'Moon Energy',isSi?(bd.moonSign?.sinhala||bd.moonSign?.english):(bd.moonSign?.english));
  addR(isSi?'සූර්ය ශක්තිය':'Sun Energy',isSi?(bd.sunSign?.sinhala||bd.sunSign?.english):(bd.sunSign?.english));
  var bcHTML = '<div class="bc"><h3>🪐 '+(isSi?'උපන් විස්තර':'Birth Details')+'</h3><table class="bt">'+bRows+'</table></div>';

  // Charts - D1 (Rashi) and D9 (Navamsha) side by side
  var chartHTML = '';
  if (opts.chartData && opts.chartData.rashiChart) {
    // Normalize rashiChart: can be an array (from /birth-chart) or object { houses, lagna } (from AI report)
    var rawRC = opts.chartData.rashiChart;
    var normalizedRC = Array.isArray(rawRC) ? rawRC : (rawRC && rawRC.houses && Array.isArray(rawRC.houses) ? rawRC.houses : null);
    // Resolve lagnaRashiId from multiple possible sources
    var chartLagnaId = opts.chartData.lagnaRashiId
      || (opts.chartData.lagna && opts.chartData.lagna.rashiId)
      || (opts.chartData.lagna && opts.chartData.lagna.id)
      || (rawRC && rawRC.lagna && rawRC.lagna.rashi && rawRC.lagna.rashi.id)
      || (normalizedRC && normalizedRC[0] && normalizedRC[0].houseNumber === 1 && normalizedRC[0].rashiId)
      || (normalizedRC && normalizedRC[0] && normalizedRC[0].rashiId)
      || 1;
    
    // Start the dual-chart container
    chartHTML = '<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:16px;margin:24px 0;page-break-inside:avoid;">';
    
    // Main birth map
    chartHTML += '<div class="chart-wrap" style="flex:1;min-width:280px;max-width:360px;">'
      +'<div class="chart-title">🏛️ '+(isSi?'උපන් ජීවිත සිතියම':'Birth Life Map')+'</div>'
      +'<div style="font-size:10px;color:#888;margin-bottom:8px;text-align:center;">'+(isSi?'උපන් මොහොතේ ජීවිත රටා':'Life patterns from your birth moment')+'</div>'
      +svgSriLankanChart(normalizedRC || opts.chartData.rashiChart, chartLagnaId, opts.lang, 300)+'</div>';
    
    // D9 Navamsha Chart (Soul Chart)
    if (opts.chartData.navamshaChart) {
      var navLagna = opts.chartData.navamshaLagna;
      chartHTML += '<div class="chart-wrap" style="flex:1;min-width:280px;max-width:360px;background:linear-gradient(135deg,#FDF2F8,#FCE7F3,#FDF2F8);border-color:rgba(236,72,153,0.15);">'
        +'<div class="chart-title" style="color:#EC4899;">💍 '+(isSi?'ගැඹුරු සබඳතා දැක්ම':'Deep Relationship View')+'</div>'
        +'<div style="font-size:10px;color:#888;margin-bottom:8px;text-align:center;">'+(isSi?'ඇතුළත සබඳතාව සහ දිගුකාලීන පහසුව':'Inner relationship and long-term comfort')+'</div>'
        +svgNavamshaChart(opts.chartData.navamshaChart, navLagna, opts.lang, 300)+'</div>';
    }
    
    chartHTML += '</div>';
    
    // Chart legend
    chartHTML += '<div style="text-align:center;font-size:9px;color:#888;margin-top:8px;">'
      +'<span style="color:#7C3AED;font-weight:600;">'+(isSi?'මූලික දැක්ම':'Main View')+'</span> = '+(isSi?'දිනපතා ජීවිත රටා':'daily life patterns')
      +' | <span style="color:#EC4899;font-weight:600;">'+(isSi?'ගැඹුරු දැක්ම':'Deep View')+'</span> = '+(isSi?'සබඳතා සහ අභ්‍යන්තර රටා':'relationship and inner patterns')
      +'</div>';
    
    // Planet abbreviation legend
    chartHTML += '<div style="text-align:center;font-size:8px;color:#999;margin-top:12px;padding:8px;background:rgba(124,58,237,0.03);border-radius:8px;">'
      +'<div style="margin-bottom:4px;font-weight:600;color:#666;">'+(isSi?'ශක්ති කෙටි නාම':'Energy Key')+':</div>'
      +'<span style="color:#F59E0B;">Su</span>=Sun '
      +'<span style="color:#A5B4FC;">Mo</span>=Moon '
      +'<span style="color:#EF4444;">Ma</span>=Mars '
      +'<span style="color:#34D399;">Me</span>=Mercury '
      +'<span style="color:#FBBF24;">Ju</span>=Jupiter '
      +'<span style="color:#F9A8D4;">Ve</span>=Venus '
      +'<span style="color:#818CF8;">Sa</span>=Saturn '
      +'<span style="color:#94A3B8;">Ra</span>=Rahu '
      +'<span style="color:#C4B5FD;">Ke</span>=Ketu '
      +'<span style="color:#EAB308;font-weight:700;">ල/ல</span>='+(isSi?'ජීවිත දිශාව':'Life Direction')
      +'</div>';
  }

  // Hero scores — prefer the server's flat post-cross-validation map, fall
  // back to extracting from raw section data (legacy reports).
  var flatScores = (opts.aiReport && opts.aiReport.sectionScores) || null;
  var heroHTML = '';
  var heroKeys = ['career','marriage','health','financial','luck','education','children','foreignTravel','spiritual'];
  var heroScores = [];
  heroKeys.forEach(function(key) {
    var s2 = null;
    if (flatScores && flatScores[key] != null && isFinite(Number(flatScores[key]))) {
      s2 = Math.min(100, Math.max(0, Math.round(Number(flatScores[key]))));
    } else {
      var rd = reportSections[key] || rawSections[key] || {};
      s2 = extractScore(key, rd);
    }
    if (s2 != null) heroScores.push({ key:key, score:s2 });
  });

  if (heroScores.length > 0) {
    var avg = Math.round(heroScores.reduce(function(a,b){return a+b.score;},0)/heroScores.length);
    heroHTML = '<div class="hero-scores"><div class="hero-title">'+(isSi?'ජීවිත ලකුණු දළ දැක්ම':'Life Score Overview')+'</div>'
      +'<div class="hero-sub">'+(isSi?'ඔබේ උපන් රටාවෙන් ලැබෙන ජීවිත ක්ෂේත්‍ර ලකුණු':'Scores derived from your birth pattern')+'</div>'
      +'<div class="hero-overall">'+svgScoreGauge(avg,120,null,isSi?'සමස්ත':'Overall')
      +'<div class="ho-label">'+scoreVerdict(avg,isSi)+'</div>'
      +'<div class="ho-sub">'+heroScores.length+(isSi?' ක්ෂේත්‍ර විශ්ලේෂණය':' areas analyzed')+'</div></div>'
      +'<div class="hero-grid" style="margin-top:20px;">';
    heroScores.forEach(function(hs) {
      var sc3 = SECTION_COLORS[hs.key]||{primary:'#7C3AED',emoji:'📋',bg:'#F5F3FF'};
      var sCol = hs.score>=75?'#10B981':hs.score>=55?'#3B82F6':hs.score>=35?'#F59E0B':'#EF4444';
      heroHTML += '<div class="hero-cell" style="background:'+sc3.bg+';"><div class="hc-emoji">'+sc3.emoji+'</div>'
        +'<div class="hc-name">'+(sectionTitles[sectionKeys.indexOf(hs.key)]||hs.key)+'</div>'
        +'<div class="hc-score" style="color:'+sCol+';">'+hs.score+'</div>'
        +'<div class="hc-bar"><div class="hc-fill" style="width:'+hs.score+'%;background:'+sCol+';"></div></div></div>';
    });
    heroHTML += '</div></div>';
  }

  // Sections
  var sectionsHTML = '';
  sectionKeys.forEach(function(key,index) {
    var narrative = narrativeSections[key];
    if (!narrative?.narrative) return;
    var sc4 = SECTION_COLORS[key]||{primary:'#7C3AED',accent:'#A78BFA',bg:'#F5F3FF',emoji:'📋'};
    var title = sectionTitles[index]||narrative.title||key;
    var rawD = reportSections[key]||rawSections[key]||narrative.rawData||{};
    var sScore = extractScore(key,rawD);
    if (sScore == null && flatScores && flatScores[key] != null && isFinite(Number(flatScores[key]))) {
      sScore = Math.min(100, Math.max(0, Math.round(Number(flatScores[key]))));
    }

    var verdictHTML = '';
    if (sScore != null) {
      verdictHTML = '<div class="verdict" style="background:linear-gradient(135deg,'+sc4.primary+','+sc4.accent+');">'
        +'<div class="verdict-hdr"><span class="verdict-emoji">'+sc4.emoji+'</span>'
        +'<span class="verdict-title">'+(isSi?'ශක්තිය':'Strength')+'</span>'
        +'<span class="verdict-score">'+sScore+'<span style="font-size:12px;">%</span></span></div>'
        +'<div class="verdict-bar-wrap"><div class="verdict-bar" style="width:'+sScore+'%;"></div></div>'
        +'<span class="verdict-rating">'+scoreVerdict(sScore,isSi)+'</span></div>';
    }

    var bodyText = markdownToHTML(narrative.narrative);

    sectionsHTML += '<div class="rs">'
      +'<div class="rs-hdr" style="background:linear-gradient(135deg,'+sc4.primary+','+sc4.accent+');">'
      +'<span class="sn">'+(index+1)+'</span><span class="se">'+sc4.emoji+'</span>'
      +'<h2>'+title+'</h2>'
      +(sScore!=null?'<span class="ss">'+sScore+'%</span>':'')
      +'</div>'
      +'<div class="rs-body" style="background:'+sc4.bg+';">'
      +verdictHTML
        +'<div class="prose">'+bodyText+'</div>'
      +'</div></div>';
  });

  // End page
  var endLogoTag = opts.logoBase64 ? '<img src="data:image/png;base64,'+opts.logoBase64+'" style="width:64px;height:64px;border-radius:16px;object-fit:cover;"/>' : '<div class="ep-icon">☸</div>';
  var endHTML = '<div class="ep">'+endLogoTag+'<div class="ep-brand" style="margin-top:12px;">ග්‍රහචාර</div><div class="ep-line"></div>'
    +'<div class="ep-tag">'+(isSi?'ඔබේ ජීවිතයේ තරු බලන්න':'Read the Stars of Your Life')+'</div>'
    +'<div class="ep-cta">'+(isSi?'📱 යෙදුම බාගන්න':'📱 Download the App')+'</div>'
    +'<div class="ep-features"><span class="ep-feat">🔮 '+(isSi?'සතිපතා නැකැත්':'Weekly Nakath')+'</span>'
    +'<span class="ep-feat">💬 '+(isSi?'AI ජ්‍යෝතිෂ chat':'AI Astro Chat')+'</span>'
    +'<span class="ep-feat">💍 '+(isSi?'සබඳතා ගැලපීම':'Compatibility')+'</span></div>'
    +'<div class="ep-url">www.grahachara.com</div>'
    +'<div class="ep-disc">'+(isSi
      ?'මේ වාර්තාව සාම්ප්‍රදායික වෛදික ජ්‍යෝතිෂ ශාස්ත්‍රය මත පදනම් වෙනවා. මේක අත්දැකීම් හා දැනගැනීම් සඳහා පමණි.'
      :'This report is for informational and reflective guidance only.')
    +'</div></div>';

  var headerLogoTag = opts.logoBase64 ? '<img src="data:image/png;base64,'+opts.logoBase64+'" style="width:18px;height:18px;border-radius:4px;object-fit:cover;margin-right:6px;vertical-align:middle;"/>' : '';

  return '<!DOCTYPE html><html lang="'+(isSi?'si':'en')+'"><head>'
    +'<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>'
    +'<title>'+(isSi?'ග්‍රහචාර වාර්තාව':'Grahachara Report')+'</title>'
    +'<style>'+sharedCSS('purple')+'</style></head><body>'
    +'<div class="wm">ග්‍රහචාර</div>'
    +'<div class="oc oc-tl"></div><div class="oc oc-tr"></div><div class="oc oc-bl"></div><div class="oc oc-br"></div>'
    +'<div class="ph"><span class="lm">'+headerLogoTag+'ග්‍රහචාර</span><span>'+(isSi?'සම්පූර්ණ ජීවිත වාර්තාව':'Complete Life Report')+'</span></div>'
    +'<div class="pf">ග්‍රහචාර &bull; www.grahachara.com &bull; '+new Date().toLocaleDateString()+'</div>'
    +coverHTML+tocHTML
    +'<div class="cp">'+bcHTML+chartHTML+'</div>'
    +heroHTML
    +'<div class="cp">'+sectionsHTML+'</div>'
    +endHTML+'</body></html>';
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
  var logoTag = opts.logoBase64 ? '<img src="data:image/png;base64,' + opts.logoBase64 + '"/>' : '<div style="font-size:44px;">💍</div>';
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
  var pEndLogoTag = opts.logoBase64 ? '<img src="data:image/png;base64,' + opts.logoBase64 + '" style="width:64px;height:64px;border-radius:16px;object-fit:cover;"/>' : '<div class="ep-icon">💍</div>';
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

  var pHeaderLogoTag = opts.logoBase64 ? '<img src="data:image/png;base64,' + opts.logoBase64 + '" style="width:18px;height:18px;border-radius:4px;object-fit:cover;margin-right:6px;vertical-align:middle;"/>' : '';

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
