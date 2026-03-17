/**
 * Spectacular PDF Report Generator — නැකත් AI
 * 
 * Generates a premium branded HTML document for PDF export with:
 * - Full-bleed cover page with gradient + logo
 * - Diagonal watermark on every page
 * - Table of contents with page anchors
 * - Color-coded section headers matching the app's cosmic theme
 * - Professional typography, ornamental borders, and zodiac decorations
 * - Branded header/footer on every page
 */

// Section color mapping (matches SECTION_META in report.js)
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

var ZODIAC_SYMBOLS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

function buildCSS() {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@300;400;600;700;800&family=Inter:wght@300;400;500;600;700;800;900&display=swap');

    :root {
      --primary: #7C3AED;
      --primary-light: #A78BFA;
      --primary-dark: #4C1D95;
      --gold: #FBBF24;
      --gold-light: #FDE68A;
      --dark: #1E1B4B;
      --text: #1F2937;
      --text-light: #6B7280;
      --bg-warm: #FEFCE8;
    }

    @page {
      margin: 0;
      size: A4;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', 'Noto Sans Sinhala', -apple-system, sans-serif;
      color: var(--text);
      line-height: 1.7;
      font-size: 13px;
      background: #fff;
    }

    /* ═══ WATERMARK ═══ */
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 90px;
      font-weight: 900;
      color: rgba(124, 58, 237, 0.03);
      letter-spacing: 16px;
      white-space: nowrap;
      z-index: 0;
      pointer-events: none;
      user-select: none;
    }

    /* ═══ PAGE HEADER / FOOTER ═══ */
    .page-header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 40px;
      font-size: 8px;
      color: rgba(124, 58, 237, 0.5);
      letter-spacing: 2px;
      text-transform: uppercase;
      border-bottom: 1px solid rgba(124, 58, 237, 0.08);
      z-index: 10;
    }
    .page-header .logo-mark {
      font-weight: 800;
      color: var(--primary);
      font-size: 9px;
    }

    .page-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 7px;
      color: rgba(124, 58, 237, 0.4);
      letter-spacing: 1.5px;
      border-top: 1px solid rgba(124, 58, 237, 0.06);
    }

    /* ═══ COVER PAGE ═══ */
    .cover {
      width: 100%;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1E1B4B 0%, #312E81 25%, #4C1D95 50%, #7C3AED 75%, #9333EA 100%);
      color: #fff;
      position: relative;
      overflow: hidden;
      page-break-after: always;
    }

    .cover::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(ellipse at 30% 50%, rgba(251,191,36,0.15) 0%, transparent 50%),
                  radial-gradient(ellipse at 70% 30%, rgba(147,51,234,0.2) 0%, transparent 50%),
                  radial-gradient(ellipse at 50% 80%, rgba(59,130,246,0.1) 0%, transparent 50%);
    }

    .cover .zodiac-ring {
      position: absolute;
      width: 500px;
      height: 500px;
      border: 2px solid rgba(251,191,36,0.12);
      border-radius: 50%;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
    .cover .zodiac-ring-inner {
      position: absolute;
      width: 400px;
      height: 400px;
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 50%;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    .cover .zodiac-symbols {
      position: absolute;
      width: 100%;
      height: 100%;
      top: 0;
      left: 0;
    }
    .cover .zodiac-sym {
      position: absolute;
      font-size: 18px;
      color: rgba(251,191,36,0.2);
    }

    .cover-content {
      position: relative;
      z-index: 2;
      text-align: center;
      padding: 40px;
    }

    .cover-logo-wrap {
      width: 100px;
      height: 100px;
      border-radius: 28px;
      overflow: hidden;
      margin: 0 auto 24px;
      border: 3px solid rgba(251,191,36,0.5);
      box-shadow: 0 0 60px rgba(251,191,36,0.3), 0 0 120px rgba(147,51,234,0.2);
    }
    .cover-logo-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .cover-brand {
      font-size: 14px;
      font-weight: 700;
      color: rgba(251,191,36,0.9);
      letter-spacing: 8px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    .cover-title {
      font-size: 36px;
      font-weight: 900;
      line-height: 1.2;
      margin-bottom: 6px;
      text-shadow: 0 2px 20px rgba(0,0,0,0.3);
    }
    .cover-title-gold {
      background: linear-gradient(135deg, #FBBF24 0%, #F59E0B 50%, #FDE68A 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .cover-subtitle {
      font-size: 16px;
      color: rgba(255,255,255,0.7);
      margin-bottom: 40px;
      font-weight: 300;
    }

    .cover-divider {
      width: 120px;
      height: 2px;
      background: linear-gradient(90deg, transparent, rgba(251,191,36,0.6), transparent);
      margin: 0 auto 32px;
    }

    .cover-name {
      font-size: 28px;
      font-weight: 800;
      color: #FDE68A;
      margin-bottom: 12px;
      text-shadow: 0 0 30px rgba(251,191,36,0.4);
    }

    .cover-details {
      font-size: 13px;
      color: rgba(255,255,255,0.55);
      line-height: 1.9;
    }
    .cover-details strong {
      color: rgba(255,255,255,0.85);
    }

    .cover-footer {
      position: absolute;
      bottom: 30px;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 9px;
      color: rgba(255,255,255,0.25);
      letter-spacing: 3px;
      text-transform: uppercase;
    }

    /* ═══ ORNAMENTAL BORDER PAGES ═══ */
    .content-page {
      padding: 52px 48px 44px;
      position: relative;
    }

    .ornament-corner-tl, .ornament-corner-tr, .ornament-corner-bl, .ornament-corner-br {
      position: fixed;
      width: 50px;
      height: 50px;
      z-index: 5;
    }
    .ornament-corner-tl { top: 6px; left: 6px; border-top: 2px solid rgba(124,58,237,0.12); border-left: 2px solid rgba(124,58,237,0.12); }
    .ornament-corner-tr { top: 6px; right: 6px; border-top: 2px solid rgba(124,58,237,0.12); border-right: 2px solid rgba(124,58,237,0.12); }
    .ornament-corner-bl { bottom: 6px; left: 6px; border-bottom: 2px solid rgba(124,58,237,0.12); border-left: 2px solid rgba(124,58,237,0.12); }
    .ornament-corner-br { bottom: 6px; right: 6px; border-bottom: 2px solid rgba(124,58,237,0.12); border-right: 2px solid rgba(124,58,237,0.12); }

    /* ═══ TABLE OF CONTENTS ═══ */
    .toc {
      page-break-after: always;
    }
    .toc-header {
      text-align: center;
      margin-bottom: 32px;
      padding-top: 20px;
    }
    .toc-header h2 {
      font-size: 22px;
      font-weight: 800;
      color: var(--primary);
      letter-spacing: 3px;
      text-transform: uppercase;
    }
    .toc-header .toc-line {
      width: 60px;
      height: 3px;
      background: linear-gradient(90deg, var(--gold), var(--primary));
      margin: 10px auto 0;
      border-radius: 2px;
    }
    .toc-list {
      list-style: none;
      padding: 0 20px;
    }
    .toc-item {
      display: flex;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px dotted rgba(124,58,237,0.1);
      gap: 12px;
    }
    .toc-item:last-child { border-bottom: none; }
    .toc-num {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      color: #fff;
      flex-shrink: 0;
    }
    .toc-emoji {
      font-size: 16px;
      width: 24px;
      text-align: center;
      flex-shrink: 0;
    }
    .toc-label {
      flex: 1;
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
    }

    /* ═══ BIRTH DATA CARD ═══ */
    .birth-card {
      background: linear-gradient(135deg, #F5F3FF 0%, #FEF3C7 50%, #F5F3FF 100%);
      border: 1px solid rgba(124,58,237,0.15);
      border-radius: 16px;
      padding: 24px 28px;
      margin-bottom: 32px;
      position: relative;
      overflow: hidden;
    }
    .birth-card::after {
      content: '☸';
      position: absolute;
      top: -10px;
      right: -10px;
      font-size: 100px;
      color: rgba(124,58,237,0.03);
      pointer-events: none;
    }
    .birth-card h3 {
      font-size: 15px;
      font-weight: 800;
      color: var(--primary);
      margin-bottom: 14px;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .birth-table {
      width: 100%;
      border-collapse: collapse;
    }
    .birth-table td {
      padding: 7px 10px;
      font-size: 12px;
      vertical-align: top;
    }
    .birth-table tr:nth-child(odd) td {
      background: rgba(124,58,237,0.03);
    }
    .birth-table .bl {
      color: var(--primary);
      font-weight: 700;
      width: 140px;
      white-space: nowrap;
    }
    .birth-table .bv {
      color: var(--text);
      font-weight: 500;
    }

    /* ═══ SECTION STYLING ═══ */
    .report-section {
      page-break-inside: avoid;
      margin-bottom: 28px;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid rgba(0,0,0,0.06);
    }

    .section-header {
      padding: 14px 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .section-header .sh-emoji {
      font-size: 20px;
    }
    .section-header .sh-num {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: rgba(255,255,255,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 800;
      color: #fff;
    }
    .section-header h2 {
      flex: 1;
      font-size: 15px;
      font-weight: 800;
      color: #fff;
      margin: 0;
      text-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }

    .section-body {
      padding: 18px 22px;
      font-size: 12.5px;
      line-height: 1.85;
      color: #374151;
    }
    .section-body strong { color: var(--text); }
    .section-body em { color: var(--primary); font-style: italic; }

    /* ═══ END PAGE ═══ */
    .end-page {
      width: 100%;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1E1B4B, #4C1D95, #7C3AED);
      color: #fff;
      text-align: center;
      page-break-before: always;
    }
    .end-page .end-divider {
      width: 80px;
      height: 2px;
      background: linear-gradient(90deg, transparent, rgba(251,191,36,0.5), transparent);
      margin: 20px auto;
    }
    .end-page .end-brand {
      font-size: 11px;
      letter-spacing: 6px;
      color: rgba(251,191,36,0.7);
      text-transform: uppercase;
      font-weight: 700;
    }
    .end-page .end-tagline {
      font-size: 14px;
      color: rgba(255,255,255,0.5);
      margin-top: 12px;
      font-style: italic;
    }
    .end-page .end-url {
      font-size: 10px;
      color: rgba(255,255,255,0.3);
      letter-spacing: 2px;
      margin-top: 20px;
    }
    .end-page .end-disclaimer {
      max-width: 400px;
      font-size: 8px;
      color: rgba(255,255,255,0.2);
      line-height: 1.6;
      margin-top: 30px;
    }

    @media print {
      .cover { page-break-after: always; }
      .toc { page-break-after: always; }
      .report-section { page-break-inside: avoid; }
      .end-page { page-break-before: always; }
    }
  `;
}

function zodiacSymbolsHTML() {
  var html = '';
  ZODIAC_SYMBOLS.forEach(function (sym, i) {
    var angle = (i / 12) * 360;
    var rad = angle * Math.PI / 180;
    var cx = 50 + Math.cos(rad) * 42;
    var cy = 50 + Math.sin(rad) * 42;
    html += '<span class="zodiac-sym" style="left:' + cx + '%;top:' + cy + '%;">' + sym + '</span>';
  });
  return html;
}

function buildCoverPage(opts) {
  var isSi = opts.lang === 'si';
  var logoTag = opts.logoBase64
    ? '<img src="data:image/png;base64,' + opts.logoBase64 + '" />'
    : '<div style="font-size:40px;">🔮</div>';

  return '<div class="cover">'
    + '<div class="zodiac-ring"></div>'
    + '<div class="zodiac-ring-inner"></div>'
    + '<div class="zodiac-symbols">' + zodiacSymbolsHTML() + '</div>'
    + '<div class="cover-content">'
    + '<div class="cover-logo-wrap">' + logoTag + '</div>'
    + '<div class="cover-brand">නැකත් AI</div>'
    + '<div class="cover-title">'
    + '<span class="cover-title-gold">'
    + (isSi ? 'සම්පූර්ණ ජීවිත වාර්තාව' : 'Complete Life Report')
    + '</span></div>'
    + '<div class="cover-subtitle">'
    + (isSi ? 'වෛදික ජ්‍යෝතිෂ විශ්ලේෂණය' : 'Vedic Astrology Analysis')
    + '</div>'
    + '<div class="cover-divider"></div>'
    + '<div class="cover-name">' + (opts.userName || (isSi ? 'ඔබ' : 'You')) + '</div>'
    + '<div class="cover-details">'
    + (opts.birthLocation ? '<strong>' + (isSi ? 'ස්ථානය' : 'Location') + ':</strong> ' + opts.birthLocation + '<br/>' : '')
    + (opts.birthDate ? '<strong>' + (isSi ? 'උපන් දිනය' : 'Born') + ':</strong> ' + opts.birthDate + (opts.birthTime ? ' &bull; ' + opts.birthTime : '') + '<br/>' : '')
    + (opts.lagnaLabel ? '<strong>' + (isSi ? 'ලග්නය' : 'Lagna') + ':</strong> ' + opts.lagnaLabel + '<br/>' : '')
    + (opts.nakshatraLabel ? '<strong>' + (isSi ? 'උපන් තරුව' : 'Nakshatra') + ':</strong> ' + opts.nakshatraLabel : '')
    + '</div>'
    + '</div>'
    + '<div class="cover-footer">' + (isSi ? 'AI මගින් සංස්කෘත ජ්‍යෝතිෂ ශාස්ත්‍රය' : 'AI-Powered Vedic Astrology') + ' &bull; ' + new Date().toLocaleDateString() + '</div>'
    + '</div>';
}

function buildTOC(sections, sectionTitles, isSi) {
  var items = '';
  sections.forEach(function (key, i) {
    var sc = SECTION_COLORS[key] || { primary: '#7C3AED', emoji: '📋' };
    items += '<li class="toc-item">'
      + '<span class="toc-num" style="background:' + sc.primary + ';">' + (i + 1) + '</span>'
      + '<span class="toc-emoji">' + sc.emoji + '</span>'
      + '<span class="toc-label">' + (sectionTitles[i] || key) + '</span>'
      + '</li>';
  });

  return '<div class="toc content-page">'
    + '<div class="toc-header">'
    + '<h2>' + (isSi ? 'අන්තර්ගතය' : 'Contents') + '</h2>'
    + '<div class="toc-line"></div>'
    + '</div>'
    + '<ul class="toc-list">' + items + '</ul>'
    + '</div>';
}

function buildBirthCard(opts) {
  var isSi = opts.lang === 'si';
  if (!opts.birthData) return '';

  var bd = opts.birthData;
  var rows = '';

  function addRow(label, value) {
    if (!value) return;
    rows += '<tr><td class="bl">' + label + '</td><td class="bv">' + value + '</td></tr>';
  }

  addRow(isSi ? 'නම' : 'Name', opts.userName);
  addRow(isSi ? 'උපන් ස්ථානය' : 'Birthplace', opts.birthLocation);
  addRow(isSi ? 'උපන් දිනය සහ වේලාව' : 'Date & Time', (opts.birthDate || '') + ' ' + (opts.birthTime || ''));
  addRow(isSi ? 'ලග්නය' : 'Ascendant (Lagna)', isSi ? (bd.lagna?.sinhala || bd.lagna?.english) : (bd.lagna?.english || bd.lagna?.name));
  addRow(isSi ? 'උපන් තරුව' : 'Birth Star', isSi ? (bd.nakshatra?.sinhala || bd.nakshatra?.name) : (bd.nakshatra?.name));
  addRow(isSi ? 'චන්ද්‍ර රාශිය' : 'Moon Sign', isSi ? (bd.moonSign?.sinhala || bd.moonSign?.english) : (bd.moonSign?.english));
  addRow(isSi ? 'සූර්ය රාශිය' : 'Sun Sign', isSi ? (bd.sunSign?.sinhala || bd.sunSign?.english) : (bd.sunSign?.english));

  return '<div class="birth-card">'
    + '<h3>🪐 ' + (isSi ? 'උපන් විස්තර' : 'Birth Details') + '</h3>'
    + '<table class="birth-table">' + rows + '</table>'
    + '</div>';
}

function buildSectionsHTML(sectionKeys, narrativeSections, sectionTitles, lang, t) {
  var isSi = lang === 'si';
  var html = '';

  sectionKeys.forEach(function (key, index) {
    var narrative = narrativeSections[key];
    if (!narrative || !narrative.narrative) return;

    var sc = SECTION_COLORS[key] || { primary: '#7C3AED', accent: '#A78BFA', bg: '#F5F3FF', emoji: '📋' };
    var title = sectionTitles[index] || narrative.title || key;

    var bodyText = (narrative.narrative || '')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');

    html += '<div class="report-section">'
      + '<div class="section-header" style="background: linear-gradient(135deg, ' + sc.primary + ', ' + sc.accent + ');">'
      + '<span class="sh-num">' + (index + 1) + '</span>'
      + '<span class="sh-emoji">' + sc.emoji + '</span>'
      + '<h2>' + title + '</h2>'
      + '</div>'
      + '<div class="section-body" style="background:' + sc.bg + ';">'
      + bodyText
      + '</div>'
      + '</div>';
  });

  return html;
}

function buildEndPage(isSi) {
  return '<div class="end-page">'
    + '<div style="font-size:48px; margin-bottom:8px;">☸</div>'
    + '<div class="end-brand">නැකත් AI</div>'
    + '<div class="end-divider"></div>'
    + '<div class="end-tagline">'
    + (isSi ? 'ඔබේ ජීවිතයේ තරු බලන්න' : 'Read the Stars of Your Life')
    + '</div>'
    + '<div class="end-url">www.nekath.ai</div>'
    + '<div class="end-disclaimer">'
    + (isSi
      ? 'මෙම වාර්තාව AI සහ සාම්ප්‍රදායික ජ්‍යෝතිෂ ශාස්ත්‍රය මත පදනම් වේ. මෙය අත්දැකීම් හා දැනගැනීම් සඳහා පමණි. වෘත්තීය තීරණ සඳහා සුදුසු විශේෂඥයින්ගෙන් උපදෙස් ලබාගන්න.'
      : 'This report is generated using AI combined with traditional Vedic astrology. It is for informational and entertainment purposes only. Please consult qualified professionals for any important life decisions.')
    + '</div>'
    + '</div>';
}

/**
 * Main export: build the full HTML document for PDF rendering.
 * 
 * @param {Object} opts
 * @param {string} opts.lang - 'en' or 'si'
 * @param {string} opts.userName
 * @param {string} opts.birthLocation
 * @param {string} opts.birthDate
 * @param {string} opts.birthTime
 * @param {string} opts.lagnaLabel
 * @param {string} opts.nakshatraLabel
 * @param {Object} opts.birthData - raw birth data object
 * @param {Object} opts.aiReport - { narrativeSections: {...} }
 * @param {string[]} opts.sectionKeys - ordered section keys
 * @param {string[]} opts.sectionTitles - resolved section titles (in order)
 * @param {function} opts.t - i18n translate function
 * @param {string} [opts.logoBase64] - base64-encoded logo PNG
 */
function generateReportHTML(opts) {
  var isSi = opts.lang === 'si';

  var sectionTitles = (opts.sectionKeys || []).map(function (key, i) {
    return opts.sectionTitles ? opts.sectionTitles[i] : key;
  });

  var ornaments = '<div class="ornament-corner-tl"></div>'
    + '<div class="ornament-corner-tr"></div>'
    + '<div class="ornament-corner-bl"></div>'
    + '<div class="ornament-corner-br"></div>';

  var watermark = '<div class="watermark">නැකත් AI</div>';

  var html = '<!DOCTYPE html><html lang="' + (isSi ? 'si' : 'en') + '"><head>'
    + '<meta charset="utf-8"/>'
    + '<meta name="viewport" content="width=device-width, initial-scale=1"/>'
    + '<title>' + (isSi ? 'නැකත් AI වාර්තාව' : 'Nekath AI Report') + '</title>'
    + '<style>' + buildCSS() + '</style>'
    + '</head><body>'
    + watermark
    + ornaments
    + '<div class="page-header">'
    + '<span class="logo-mark">නැකත් AI</span>'
    + '<span>' + (isSi ? 'සම්පූර්ණ ජීවිත වාර්තාව' : 'Complete Life Report') + '</span>'
    + '</div>'
    + '<div class="page-footer">'
    + 'නැකත් AI &bull; www.nekath.ai &bull; ' + new Date().toLocaleDateString()
    + '</div>'
    + buildCoverPage(opts)
    + buildTOC(opts.sectionKeys || [], sectionTitles, isSi)
    + '<div class="content-page">'
    + buildBirthCard(opts)
    + buildSectionsHTML(opts.sectionKeys || [], (opts.aiReport && opts.aiReport.narrativeSections) || {}, sectionTitles, opts.lang, opts.t)
    + '</div>'
    + buildEndPage(isSi)
    + '</body></html>';

  return html;
}

module.exports = { generateReportHTML, SECTION_COLORS };
