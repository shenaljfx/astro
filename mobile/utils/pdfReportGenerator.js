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
 * ─ Porondam: dual-chart layout, 7-factor bars, advanced analysis
 * 
 * Exports:
 *   generateReportHTML(opts)  – Full Life Report PDF
 *   generatePorondamHTML(opts) – Marriage Compatibility PDF
 *   loadLogoBase64()          – Load app logo as base64 for PDF embedding
 *   SECTION_COLORS
 */

import { APP_LOGO_BASE64 } from '../assets/logo-base64';

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

function pdfFactorCopy(name, isSi) {
  var map = {
    Dina: ['Daily Harmony', 'දෛනික සමගිය'], Gana: ['Temperament Fit', 'ස්වභාව ගැළපීම'],
    Yoni: ['Intimacy Comfort', 'සමීප පහසුව'], Rashi: ['Mind & Home Fit', 'මනස සහ ගෘහ ගැළපීම'],
    Vasya: ['Mutual Attraction', 'ආකර්ෂණ ගැළපීම'], Nadi: ['Family Line Fit', 'පවුල් ගලායෑම් ගැළපීම'],
    Mahendra: ['Growth Support', 'වර්ධන සහාය'],
  };
  var selected = map[name];
  return selected ? (isSi ? selected[1] : selected[0]) : (isSi ? 'සබඳතා ගැළපීම' : 'Relationship Fit');
}

function pdfChallengeCopy(item, isSi) {
  var severity = item && item.severity ? String(item.severity).toLowerCase() : '';
  if (isSi) {
    return {
      label: item && item.cancelled ? 'සැලකිල්ල අඩු වූ කරුණ' : (severity.indexOf('severe') !== -1 ? 'වැඩි සැලකිල්ලක් අවශ්‍ය කරුණ' : 'සබඳතාවේ සැලකිලිමත් කරුණ'),
      desc: item && item.cancelled ? 'දැඩි අවදානමක් ලෙස ගන්න ඕන නෑ. එත් විවෘත කතාව සහ හොඳ පුරුදු තබාගන්න.' : 'ඉවසීම, විශ්වාසය, සහ තීරණ ගැනීමේදී වැඩි සැලකිල්ලක් ඕනේ කියලා පෙන්වනවා.',
    };
  }
  return {
    label: item && item.cancelled ? 'Reduced Care Point' : (severity.indexOf('severe') !== -1 ? 'High-Care Relationship Point' : 'Relationship Care Point'),
    desc: item && item.cancelled ? 'This is not a strong warning now, but open communication and steady habits still matter.' : 'This suggests an area where patience, trust, and careful decisions are important.',
  };
}

function pdfSupportLevel(score, maxScore, isSi) {
  var ratio = (score || 0) / (maxScore || 1);
  if (isSi) return ratio >= 0.7 ? 'ශක්තිමත් සහාය' : (ratio >= 0.45 ? 'මිශ්‍ර සහාය' : 'වැඩි සැලකිල්ලක් අවශ්‍යයි');
  return ratio >= 0.7 ? 'Strong Support' : (ratio >= 0.45 ? 'Mixed Support' : 'Needs Extra Care');
}

function pdfLifePeriodCopy(period, isSi) {
  return period && period.isBeneficPeriod
    ? (isSi ? 'සහාය දෙන ජීවිත අදියර' : 'Supportive Life Period')
    : (isSi ? 'වැඩි සැලකිල්ලක් අවශ්‍ය අදියර' : 'Careful Life Period');
}

function pdfAdvancedDesc(kind, data, isSi) {
  if (kind === 'lifePhase') {
    var harmony = String(data && data.harmony || '').toLowerCase();
    if (harmony === 'harmonious') return isSi ? 'දෙදෙනාගේ වර්තමාන ජීවිත අදියර එකිනෙකාට සහාය දෙන බව පෙන්වනවා.' : 'Both current life periods look supportive together.';
    if (harmony === 'conflicting') return isSi ? 'වර්තමාන ජීවිත රටා වෙනස් විය හැක. ඉක්මන් තීරණ වලට පෙර කතාබහ සහ ඉවසීම වැදගත්.' : 'The current life rhythms may feel different. Use patience and clear conversations before major decisions.';
    return isSi ? 'මේ අදියර මිශ්‍ර සහායක් පෙන්වනවා. කාලය සහ පවුල් තීරණ පැහැදිලිව සකසන්න.' : 'This period shows mixed support. Keep timing and family decisions clear.';
  }
  if (kind === 'deepBond') return isSi ? 'දිගුකාලීන බැඳීම, තියෙනවාුළත පහසුව, සහ එකට ජීවත් වීමේ රටාව ගැන ප්‍රායෝගික කියවීමකි.' : 'This reads long-term bond, inner comfort, and shared-life rhythm.';
  if (kind === 'carePoint') return isSi ? 'මේ කොටස ගැටුම්, කෝපය, සහ ඉක්මන් තීරණ ගැන වැඩි සැලකිල්ලක් ඕනෙද කියලා පෙන්වනවා.' : 'This shows whether conflict, impatience, and rushed decisions need extra care.';
  return isSi ? 'මේ කොටස දිගුකාලීන සබඳතා සහාය පෙන්වනවා.' : 'This section shows long-term relationship support.';
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
    +'<div class="cn">'+(opts.userName||(isSi?'ඔයා':'You'))+'</div>'
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

  // Hero scores
  var heroHTML = '';
  var heroKeys = ['career','marriage','health','financial','luck','education','children','foreignTravel','spiritual'];
  var heroScores = [];
  heroKeys.forEach(function(key) {
    var rd = reportSections[key] || rawSections[key] || {};
    var s2 = extractScore(key, rd);
    if (s2 != null) heroScores.push({ key:key, score:s2 });
  });

  if (heroScores.length > 0) {
    var avg = Math.round(heroScores.reduce(function(a,b){return a+b.score;},0)/heroScores.length);
    heroHTML = '<div class="hero-scores"><div class="hero-title">'+(isSi?'ජීවිත ලකුණු දළ දැක්ම':'Life Score Overview')+'</div>'
      +'<div class="hero-sub">'+(isSi?'ඔයාගේ උපන් රටාවෙන් ලැබෙන ජීවිත ක්ෂේත්‍ර ලකුණු':'Scores derived from your birth pattern')+'</div>'
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
    var rawD = reportSections[key]||rawSections[key]||{};
    var sScore = extractScore(key,rawD);

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
    +'<div class="ep-tag">'+(isSi?'ඔයාගේ ජීවිතයේ තරු බලන්න':'Read the Stars of Your Life')+'</div>'
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
// ═══════════════════════════════════════════════════════════════
function generatePorondamHTML(opts) {
  var isSi = opts.lang === 'si';
  var data = opts.data || {};
  var brideName = opts.brideName || (isSi?'මනාලිය':'Bride');
  var groomName = opts.groomName || (isSi?'මනාලයා':'Groom');
  var pct = data.maxPossibleScore > 0 ? Math.round((data.totalScore/data.maxPossibleScore)*100) : 0;
  var scoreColor = pct>=75?'#10B981':pct>=50?'#F59E0B':pct>=30?'#F97316':'#EF4444';

  var logoTag = opts.logoBase64 ? '<img src="data:image/png;base64,'+opts.logoBase64+'"/>' : '<div style="font-size:44px;">💍</div>';

  // Cover
  var coverHTML = '<div class="cover cover-porondam">'
    +'<div class="zr" style="border-color:rgba(249,168,212,0.15);"></div><div class="zri" style="border-color:rgba(255,255,255,0.05);"></div>'
    +'<div class="cc"><div class="cl" style="border-color:rgba(249,168,212,0.5);">'+logoTag+'</div>'
    +'<div class="cb">ග්‍රහචාර</div>'
    +'<div class="ct"><span class="ctg">'+(isSi?'සම්පූර්ණ සබඳතා ගැලපීම් වාර්තාව':'Complete Compatibility Report')+'</span></div>'
    +'<div class="cs">'+(isSi?'ප්‍රායෝගික සබඳතා විශ්ලේෂණය':'Practical Relationship Compatibility')+'</div>'
    +'<div class="cd"></div>'
    +'<div class="cn">'+brideName+'<span style="display:block;font-size:14px;color:rgba(255,255,255,0.5);margin:6px 0;font-weight:400;">'+(isSi?'සහ':'&')+'</span>'+groomName+'</div>'
    +'</div><div class="cfb">'+new Date().toLocaleDateString()+'</div></div>';

  // Grand score page
  var scoreHTML = '<div class="hero-scores" style="text-align:center;">'
    +'<div class="hero-title" style="color:#BE185D;">'+(isSi?'ගැලපීම් ප්‍රතිඵලය':'Compatibility Result')+'</div>'
    +'<div class="hero-sub">'+(isSi?'සබඳතා රටා 7 · ලකුණු 20':'7 Signals · 20 Points')+'</div>'
    +'<div class="hero-overall" style="background:linear-gradient(135deg,#FDF2F8,#FEF3C7,#F5F3FF);border-color:rgba(236,72,153,0.12);">'
    +svgScoreGauge(pct,140,scoreColor,null)
    +'<div class="ho-label" style="margin-top:8px;">'+(data.ratingEmoji||'💍')+' '+(isSi&&data.ratingSinhala?data.ratingSinhala:data.rating||'')+'</div>'
    +'<div class="ho-sub">'+(data.totalScore||0)+'/'+(data.maxPossibleScore||20)+' '+(isSi?'ගැලපීම් ලකුණු':'Compatibility Score')+'</div></div>';

  // Combined score
  if (data.advancedPorondam?.combined) {
    var adv = data.advancedPorondam.combined;
    scoreHTML += '<div style="display:flex;justify-content:center;gap:20px;margin-top:24px;">'
      +'<div style="text-align:center;padding:16px 24px;background:#fdf2f8;border-radius:14px;border:1px solid rgba(236,72,153,0.1);">'
      +'<div style="font-size:28px;font-weight:900;color:#FF8C00;">'+(data.totalScore||0)+'/'+(data.maxPossibleScore||20)+'</div>'
      +'<div style="font-size:10px;color:#888;margin-top:2px;">'+(isSi?'සාම්ප්‍රදායික':'Traditional')+'</div></div>'
      +'<div style="text-align:center;padding:16px 24px;background:#fdf2f8;border-radius:14px;border:1px solid rgba(236,72,153,0.1);">'
      +'<div style="font-size:28px;font-weight:900;color:#3B82F6;">'+(data.advancedPorondam.advanced?.advancedScore||'?')+'/'+(data.advancedPorondam.advanced?.advancedMaxScore||'?')+'</div>'
      +'<div style="font-size:10px;color:#888;margin-top:2px;">'+(isSi?'උසස්':'Advanced')+'</div></div>'
      +'<div style="text-align:center;padding:16px 24px;background:linear-gradient(135deg,#fdf2f8,#FEF3C7);border-radius:14px;border:1px solid rgba(236,72,153,0.15);">'
      +svgScoreGauge(adv.percentage,60,null,null)
      +'<div style="font-size:10px;color:#888;margin-top:4px;">'+(isSi?'එකාබද්ධ':'Combined')+'</div></div></div>';
  }
  scoreHTML += '</div>';

  // Charts side by side
  var chartsHTML = '';
  if (data.brideChart || data.groomChart) {
    chartsHTML = '<div class="cp" style="page-break-inside:avoid;"><div style="display:flex;gap:20px;justify-content:center;align-items:flex-start;">';
    if (data.brideChart) chartsHTML += '<div class="chart-wrap" style="flex:1;max-width:48%;"><div class="chart-title" style="color:#EC4899;">💐 '+(isSi?'මනාලියගේ උපන් විස්තර':"Bride's Birth Details")+'</div>'+svgSriLankanChart(data.brideChart.rashiChart,data.brideChart.lagnaRashiId,opts.lang,240)+'</div>';
    if (data.groomChart) chartsHTML += '<div class="chart-wrap" style="flex:1;max-width:48%;"><div class="chart-title" style="color:#3B82F6;">🤵 '+(isSi?'මනාලයාගේ උපන් විස්තර':"Groom's Birth Details")+'</div>'+svgSriLankanChart(data.groomChart.rashiChart,data.groomChart.lagnaRashiId,opts.lang,240)+'</div>';
    chartsHTML += '</div></div>';
  }

  // 7 Factors
  var factorsHTML = '';
  if (data.factors?.length > 0) {
    factorsHTML = '<div class="cp" style="page-break-inside:avoid;">'
      +'<div style="text-align:center;margin-bottom:18px;"><h2 style="font-size:18px;font-weight:800;color:#BE185D;letter-spacing:1px;">📊 '+(isSi?'සබඳතා රටා':'Relationship Signals')+'</h2>'
      +'<p style="font-size:12px;color:#888;">'+(isSi?'රටා 7 · ලකුණු 20':'7 Signals · 20 Points')+'</p></div>';
    data.factors.forEach(function(f) {
      var fPct = f.maxScore>0 ? Math.round((f.score/f.maxScore)*100) : 0;
      var fColor = fPct>=75?'#10B981':fPct>=50?'#F59E0B':'#EF4444';
      var desc = isSi ? 'මේ කොටස දිනපතා සැනසීම, විශ්වාසය, සහ දිගුකාලීන ගෘහ ජීවිතයට බලපාන විදිහ පෙන්වනවා.' : 'This shows how this area affects daily comfort, trust, and long-term home life.';
      var fName = pdfFactorCopy(f.name, isSi);
      factorsHTML += '<div class="factor-row" style="--factor-color:'+fColor+';">'
        +'<div class="factor-head">'
        +'<strong class="factor-title">'+fName+'</strong>'
        +'<div class="factor-score">'+svgScoreGauge(fPct,36,fColor,null)
        +'<strong>'+f.score+'/'+f.maxScore+'</strong></div></div>'
        +'<div class="factor-track"><div class="factor-fill" style="width:'+fPct+'%;"></div></div>'
        +(desc?'<p class="factor-desc">'+desc+'</p>':'')
        +'</div>';
    });
    factorsHTML += '</div>';
  }

  // Doshas
  var doshasHTML = '';
  if (data.doshas?.length > 0) {
    doshasHTML = '<div class="cp" style="page-break-inside:avoid;">'
      +'<h2 style="font-size:18px;font-weight:800;color:#DC2626;margin-bottom:14px;border-bottom:2px solid #FEE2E2;padding-bottom:8px;">⚠️ '+(isSi?'සැලකිලිමත් කරුණු':'Challenges')+'</h2>';
    data.doshas.forEach(function(d) {
      var challenge = pdfChallengeCopy(d, isSi);
      doshasHTML += '<div class="care-card">'
        +'<strong>'+challenge.label+'</strong>'
        +'<p>'+challenge.desc+'</p></div>';
    });
    doshasHTML += '</div>';
  }

  // Advanced analysis sections
  var advHTML = '';

  // Dasha Compatibility
  if (data.advancedPorondam?.advanced?.dashaCompatibility && data.advancedPorondam.advanced.dashaCompatibility.harmony !== 'unknown') {
    var da = data.advancedPorondam.advanced.dashaCompatibility;
    advHTML += '<div class="rs" style="page-break-inside:avoid;">'
      +'<div class="rs-hdr" style="background:linear-gradient(135deg,#6366F1,#A5B4FC);"><span class="se">🌀</span><h2>'+(isSi?'ජීවිත අදියර ගැලපුම':'Life Phase Match')+'</h2><span class="ss">'+da.score+'/'+da.maxScore+'</span></div>'
      +'<div class="rs-body" style="background:#EEF2FF;"><div style="display:flex;gap:14px;margin-bottom:12px;">';
    [{label:brideName,emoji:'👰',color:'#EC4899',d:da.bride},{label:groomName,emoji:'🤵',color:'#3B82F6',d:da.groom}].forEach(function(p){
      if(!p.d)return;
      advHTML+='<div style="flex:1;padding:12px;background:#fff;border-radius:10px;border:1px solid rgba(0,0,0,0.06);">'
        +'<div style="font-size:11px;font-weight:700;color:'+p.color+';margin-bottom:6px;">'+p.emoji+' '+p.label+'</div>'
        +'<div style="font-size:10px;color:#888;">'+(isSi?'දැන් ඉන්න ජීවිත අදියර':'Current Life Period')+'</div>'
        +'<div style="font-size:16px;font-weight:800;color:#333;">'+pdfLifePeriodCopy(p.d, isSi)+'</div>'
        +'<div style="margin-top:4px;display:inline-block;padding:2px 8px;border-radius:8px;font-size:9px;font-weight:700;background:'+(p.d.isBeneficPeriod?'rgba(16,185,129,0.1);color:#10B981':'rgba(245,158,11,0.1);color:#F59E0B')+';">'
        +(p.d.isBeneficPeriod?(isSi?'සහාය දෙයි':'Supportive'):(isSi?'වැඩි සැලකිල්ලක් ඕන':'Needs Care'))+'</div></div>';
    });
      advHTML+='</div><p style="color:#555;font-size:12px;line-height:1.7;">'+pdfAdvancedDesc('lifePhase', da, isSi)+'</p></div></div>';
  }

  // Navamsha D9
  if (data.advancedPorondam?.advanced?.navamshaCompatibility) {
    var nav = data.advancedPorondam.advanced.navamshaCompatibility;
    advHTML += '<div class="rs" style="page-break-inside:avoid;">'
      +'<div class="rs-hdr" style="background:linear-gradient(135deg,#EC4899,#F9A8D4);"><span class="se">💞</span><h2>'+(isSi?'ගැඹුරු සබඳතා ගැලපීම':'Deep Relationship Match')+'</h2><span class="ss">'+nav.score+'/'+nav.maxScore+'</span></div>'
      +'<div class="rs-body" style="background:#FDF2F8;"><div style="display:flex;gap:14px;margin-bottom:12px;">'
      +'<div style="flex:1;text-align:center;padding:12px;background:#fff;border-radius:10px;border:1px solid rgba(236,72,153,0.1);"><div style="font-size:10px;color:#EC4899;font-weight:700;">👰 '+(isSi?'ඇතුළත රටාව':'Inner Pattern')+'</div><div style="font-size:18px;font-weight:800;color:#333;margin-top:4px;">'+pdfSupportLevel(nav.score, nav.maxScore, isSi)+'</div></div>'
      +'<div style="flex:1;text-align:center;padding:12px;background:#fff;border-radius:10px;border:1px solid rgba(59,130,246,0.1);"><div style="font-size:10px;color:#3B82F6;font-weight:700;">🤵 '+(isSi?'ඇතුළත රටාව':'Inner Pattern')+'</div><div style="font-size:18px;font-weight:800;color:#333;margin-top:4px;">'+pdfSupportLevel(nav.score, nav.maxScore, isSi)+'</div></div></div>';
    advHTML+='<div class="insight-strip">✨ '+pdfAdvancedDesc('deepBond', nav, isSi)+'</div>';
    advHTML+='<p style="color:#888;font-size:11px;font-style:italic;margin-top:8px;">'+pdfAdvancedDesc('deepBond', nav, isSi)+'</p></div></div>';
  }

  // Mangala Dosha
  if (data.advancedPorondam?.advanced?.mangalaDosha && data.advancedPorondam.advanced.mangalaDosha.severity !== 'unknown') {
    var mars = data.advancedPorondam.advanced.mangalaDosha;
    advHTML += '<div class="rs" style="page-break-inside:avoid;">'
      +'<div class="rs-hdr" style="background:linear-gradient(135deg,#EF4444,#FCA5A5);"><span class="se">⚔️</span><h2>'+(isSi?'ගැටුම් සැලකිල්ල පරීක්ෂාව':'Conflict Care Check')+'</h2><span class="ss">'+mars.score+'/'+mars.maxScore+'</span></div>'
      +'<div class="rs-body" style="background:#FEF2F2;"><div style="display:flex;gap:14px;margin-bottom:12px;">';
    [{label:brideName,emoji:'👰',d:mars.bride},{label:groomName,emoji:'🤵',d:mars.groom}].forEach(function(p){
      if(!p.d)return;
      var hasD=p.d.hasDosha;
      advHTML+='<div style="flex:1;padding:12px;background:#fff;border-radius:10px;border:1px solid rgba(0,0,0,0.06);">'
        +'<div style="font-size:11px;font-weight:700;color:#555;margin-bottom:6px;">'+p.emoji+' '+p.label+'</div>'
        +'<div style="font-size:12px;">'+(hasD?(p.d.cancelled?'✅':'🔥'):'✅')+' '
        +(hasD?(p.d.cancelled?(isSi?'අඩු වූ සැලකිලිමත් කරුණ':'Reduced Care Point'):(isSi?'වැඩි සැලකිලිමත් කරුණ':'High-Care Point')):(isSi?'මේ කොටස හොඳින් සහාය දෙනවා':'This area looks supportive'))+'</div>'
        +(hasD&&p.d.cancelled?'<div style="font-size:10px;color:#10B981;font-weight:700;margin-top:4px;">✅ '+(isSi?'බලය අඩුයි':'Reduced')+'</div>':'')+'</div>';
    });
    advHTML+='</div><p style="color:#555;font-size:12px;line-height:1.7;">'+pdfAdvancedDesc('carePoint', mars, isSi)+'</p></div></div>';
  }

  // Relationship support strength
  if (data.advancedPorondam?.advanced?.marriagePlanetStrength) {
    var mps = data.advancedPorondam.advanced.marriagePlanetStrength;
    advHTML += '<div class="rs" style="page-break-inside:avoid;">'
      +'<div class="rs-hdr" style="background:linear-gradient(135deg,#A855F7,#D8B4FE);"><span class="se">💎</span><h2>'+(isSi?'සබඳතා සහාය ශක්තිය':'Relationship Support Strength')+'</h2><span class="ss">'+mps.score+'/'+mps.maxScore+'</span></div>'
      +'<div class="rs-body" style="background:#FAF5FF;"><div style="display:flex;gap:14px;margin-bottom:12px;">';
    [{label:brideName,emoji:'👰',color:'#EC4899',d:mps.bride},{label:groomName,emoji:'🤵',color:'#3B82F6',d:mps.groom}].forEach(function(p){
      if(!p.d)return;
      var vc=p.d.venusAssessment==='Strong'?'#10B981':p.d.venusAssessment==='Moderate'?'#F59E0B':'#EF4444';
      var lc=p.d.seventhLordAssessment==='Strong'?'#10B981':p.d.seventhLordAssessment==='Moderate'?'#F59E0B':'#EF4444';
      advHTML+='<div style="flex:1;padding:12px;background:#fff;border-radius:10px;border:1px solid rgba(0,0,0,0.06);">'
        +'<div style="font-size:11px;font-weight:700;color:'+p.color+';margin-bottom:8px;">'+p.emoji+' '+p.label+'</div>'
        +'<div style="font-size:9px;color:#888;font-weight:700;">'+(isSi?'ආදර සහාය':'Affection Support')+'</div>'
        +'<div style="height:4px;background:rgba(0,0,0,0.04);border-radius:2px;margin:3px 0 8px;overflow:hidden;"><div style="height:4px;background:'+vc+';width:'+(p.d.venusStrength||0)+'%;border-radius:2px;"></div></div>'
        +'<div style="font-size:9px;color:#888;font-weight:700;">'+(isSi?'කැපවීම් සහාය':'Commitment Support')+'</div>'
        +'<div style="height:4px;background:rgba(0,0,0,0.04);border-radius:2px;margin:3px 0;overflow:hidden;"><div style="height:4px;background:'+lc+';width:'+(p.d.seventhLordStrength||0)+'%;border-radius:2px;"></div></div></div>';
    });
    advHTML+='</div><p style="color:#555;font-size:12px;line-height:1.7;">'+(isSi?'ආදරය පෙන්වීම, කැපවීම, සහ දිගුකාලීන සම්බන්ධතාව පවත්වා ගැනීමට ලැබෙන සහාය මෙතනින් පෙන්වනවා.':'This shows support for affection, commitment, and maintaining the relationship over time.')+'</p></div></div>';
  }

  // Wedding Windows
  if (data.advancedPorondam?.advanced?.weddingWindows?.favorableWindows?.length > 0) {
    advHTML += '<div class="rs" style="page-break-inside:avoid;">'
      +'<div class="rs-hdr" style="background:linear-gradient(135deg,#10B981,#34D399);"><span class="se">📅</span><h2>'+(isSi?'හොඳම විවාහ කාල':'Best Wedding Windows')+'</h2></div>'
      +'<div class="rs-body" style="background:#ECFDF5;">';
    data.advancedPorondam.advanced.weddingWindows.favorableWindows.forEach(function(w,i){
      advHTML+='<div style="display:flex;gap:10px;padding:10px 0;'+(i>0?'border-top:1px solid rgba(0,0,0,0.04);':'')+'">'
        +'<div style="width:32px;height:32px;border-radius:16px;background:rgba(16,185,129,0.1);display:flex;align-items:center;justify-content:center;font-size:16px;">📅</div>'
        +'<div style="flex:1;">'
        +(w.end?'<div style="font-size:13px;font-weight:700;color:#333;">'+w.start+' → '+w.end+'</div>':'')
        +'<div style="font-size:11px;color:#666;margin-top:2px;">'+(w.reason||'')+'</div></div></div>';
    });
    advHTML+='</div></div>';
  }

  // AI Report
  var reportHTML = '';
  if (opts.report) {
    reportHTML = '<div class="cp" style="page-break-inside:avoid;">'
      +'<h2 style="font-size:18px;font-weight:800;color:#BE185D;margin-bottom:14px;border-bottom:2px solid #FCE7F3;padding-bottom:8px;">🔮 '+(isSi?'විස්තරාත්මක ජ්‍යෝතිෂ වාර්තාව':'Detailed Astrology Report')+'</h2>'
      +'<div class="rs-body" style="background:#fdf2f8;">'
      +'<div class="prose">'+markdownToHTML(opts.report)+'</div></div></div>';
  }

  // End page
  var pEndLogoTag = opts.logoBase64 ? '<img src="data:image/png;base64,'+opts.logoBase64+'" style="width:64px;height:64px;border-radius:16px;object-fit:cover;"/>' : '<div class="ep-icon">💍</div>';
  var endHTML = '<div class="ep ep-porondam">'
    +pEndLogoTag+'<div class="ep-brand" style="margin-top:12px;">ග්‍රහචාර</div><div class="ep-line"></div>'
    +'<div class="ep-tag">'+(isSi?'ඔයාගේ ජීවිතයේ තරු බලන්න':'Read the Stars of Your Life')+'</div>'
    +'<div class="ep-cta">'+(isSi?'📱 යෙදුම බාගන්න':'📱 Download the App')+'</div>'
    +'<div class="ep-features"><span class="ep-feat">🔮 '+(isSi?'සතිපතා නැකැත්':'Weekly Nakath')+'</span>'
    +'<span class="ep-feat">📊 '+(isSi?'සම්පූර්ණ වාර්තා':'Full Reports')+'</span>'
    +'<span class="ep-feat">💬 '+(isSi?'AI ජ්‍යෝතිෂ chat':'AI Astro Chat')+'</span></div>'
    +'<div class="ep-url">www.grahachara.com</div>'
    +'<div class="ep-disc">'+(isSi
      ?'මේ වාර්තාව සාම්ප්‍රදායික ජ්‍යෝතිෂ ශාස්ත්‍රය මත පදනම් වෙනවා. මේක දැනගැනීම් සඳහා පමණි.'
      :'This report is for informational and reflective guidance only.')+'</div></div>';

  var pHeaderLogoTag = opts.logoBase64 ? '<img src="data:image/png;base64,'+opts.logoBase64+'" style="width:18px;height:18px;border-radius:4px;object-fit:cover;margin-right:6px;vertical-align:middle;"/>' : '';

  return '<!DOCTYPE html><html lang="'+(isSi?'si':'en')+'"><head>'
    +'<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>'
    +'<title>'+(isSi?'ග්‍රහචාර සබඳතා ගැලපීම':'Grahachara Compatibility')+'</title>'
    +'<style>'+sharedCSS('pink')+'</style></head><body>'
    +'<div class="wm">ග්‍රහචාර</div>'
    +'<div class="oc oc-tl"></div><div class="oc oc-tr"></div><div class="oc oc-bl"></div><div class="oc oc-br"></div>'
    +'<div class="ph"><span class="lm" style="color:#EC4899;">'+pHeaderLogoTag+'ග්‍රහචාර</span><span>'+(isSi?'පොරොන්දම් වාර්තාව':'Porondam Report')+'</span></div>'
    +'<div class="pf">ග්‍රහචාර &bull; www.grahachara.com &bull; '+new Date().toLocaleDateString()+'</div>'
    +coverHTML+scoreHTML+chartsHTML+factorsHTML+doshasHTML
    +'<div class="cp">'+advHTML+'</div>'
    +reportHTML+endHTML+'</body></html>';
}

module.exports = { generateReportHTML, generatePorondamHTML, loadLogoBase64, SECTION_COLORS };
