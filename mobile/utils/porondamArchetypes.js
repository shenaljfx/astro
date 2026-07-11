/**
 * Porondam Relationship Archetypes — client mirror (explorer only)
 * ================================================================
 *
 * The 12-lagna explorer runs BEFORE a partner is entered, so it must derive
 * archetypes on the device. This mirrors server/src/engine/porondamArchetype.js
 * (names, bands, derivation kept identical). The two-person RESULT uses the
 * server's richer `coupleReading` instead of this.
 *
 * Client-only extension: each archetype also carries a `detail` — a short,
 * simple explanation (what the bond feels like + one practical tip) shown in
 * the explorer's detail panel. Same-sign pairs are fully supported.
 *
 * Voice: simple, warm, everyday Sinhala in the respectful ඔබ register
 * (never ඔයා). Short sentences a reader understands instantly.
 */

var ELEMENT = {
  1: 'fire', 5: 'fire', 9: 'fire',
  2: 'earth', 6: 'earth', 10: 'earth',
  3: 'air', 7: 'air', 11: 'air',
  4: 'water', 8: 'water', 12: 'water',
};

export var BANDS = {
  harmony:  { rank: 4, en: 'Natural Harmony',   si: 'ස්වාභාවික ගැළපීම', color: '#34D399', gradient: ['#34D399', '#10B981'] },
  magnetic: { rank: 3, en: 'Strong Attraction', si: 'ප්‍රබල ආකර්ෂණය',   color: '#FBBF24', gradient: ['#FBBF24', '#F59E0B'] },
  balanced: { rank: 2, en: 'Balanced Bond',     si: 'සමබර බැඳීම',       color: '#A78BFA', gradient: ['#A78BFA', '#8B5CF6'] },
  growth:   { rank: 1, en: 'Grows with Effort', si: 'උත්සාහයෙන් වැඩෙන', color: '#F472B6', gradient: ['#F472B6', '#EC4899'] },
};

var ARCHETYPES = {
  blessed_harmony: {
    band: 'harmony', emblem: 'sunny-outline',
    en: {
      name: 'Blessed Harmony',
      essence: 'You naturally understand each other — trust comes easily, and life feels lighter together.',
      detail: 'Talking, trusting and planning feel easy with this sign. One thing to remember: even an easy bond fades if taken for granted — keep giving it real time.',
    },
    si: {
      name: 'සුබ සංහිඳියාව',
      essence: 'ඔබ දෙදෙනා ඉබේම එකිනෙකා තේරුම් ගන්නවා — විශ්වාසය පහසුවෙන් ගොඩනැගෙනවා, ජීවිතය එකට සැහැල්ලුයි.',
      detail: 'මේ ලග්නය සමඟ කතා කිරීම, විශ්වාස කිරීම, සැලසුම් කිරීම පහසුයි. මතක තබාගන්න: පහසු බැඳීමකුත් නොසලකා හැරියොත් මැලවෙනවා — කාලය දෙන එක නවත්තන්න එපා.',
    },
  },
  still_waters: {
    band: 'harmony', emblem: 'water-outline',
    en: {
      name: 'Still Waters Run Deep',
      essence: 'A quiet, deep bond — not many words needed, feelings are simply understood.',
      detail: 'You can sit in silence together and still feel close. Just say the important things out loud too — quiet love also needs words sometimes.',
    },
    si: {
      name: 'ගැඹුරු නිසල දිය',
      essence: 'නිහඬ, ගැඹුරු බැඳීමක් — වචන ගොඩක් ඕනෑ නැහැ, හැඟීම් ඉබේම තේරෙනවා.',
      detail: 'නිශ්ශබ්දව එකට සිටියත් සමීපකම දැනෙනවා. ඒත් වැදගත් දේවල් වචනවලින්ම කියන්නත් අමතක කරන්න එපා — නිහඬ ආදරයටත් සමහර විට වචන ඕනෑ.',
    },
  },
  mirror_souls: {
    band: 'harmony', emblem: 'contrast-outline',
    en: {
      name: 'Mirror Souls',
      essence: 'You are alike in many ways — deep understanding, plus a shared duty to fix the same weak spots together.',
      detail: 'Same sign — you get each other instantly, strengths and weaknesses alike. Watch that you both don’t avoid the same hard tasks; split them on purpose.',
    },
    si: {
      name: 'එකම පිළිබිඹුව',
      essence: 'ඔබ දෙදෙනා බොහෝ දුරට සමානයි — ගැඹුරු අවබෝධයක් තිබෙනවා; එකම අඩුපාඩුත් දෙදෙනා එකට හදාගත යුතුයි.',
      detail: 'එකම ලග්නය නිසා ශක්තියත් දුර්වලකමත් දෙකම සමානයි — එකිනෙකා ක්ෂණයෙන් තේරෙනවා. දෙදෙනාම එකම අමාරු වැඩ මඟහරින්න ඉඩ තිබෙනවා — ඒවා හිතලා බෙදාගන්න.',
    },
  },
  two_lamps: {
    band: 'harmony', emblem: 'flame-outline',
    en: {
      name: 'Two Lamps, One Flame',
      essence: 'Two steady people making one warm home — comfort, loyalty and a feeling of safety.',
      detail: 'A calm, homely bond — you both value stability and quietly look after each other. Add a little adventure now and then, so comfort never turns into boredom.',
    },
    si: {
      name: 'එක් සිළුවක ලාම්පු දෙකක්',
      essence: 'ස්ථාවර දෙදෙනෙක් එක උණුසුම් නිවසක් හදනවා — සැනසීම, පක්ෂපාත බව සහ ආරක්ෂිත බව.',
      detail: 'සන්සුන්, ගෙදරදොර උණුසුම ඇති බැඳීමක් — දෙදෙනාම ස්ථාවර බවට කැමතියි, නිහඬව එකිනෙකා බලාගන්නවා. ඉඳහිට අලුත් දෙයක් එකට කරන්න — එවිට පහසුව කම්මැලිකමක් වෙන්නේ නැහැ.',
    },
  },
  foundation_builders: {
    band: 'magnetic', emblem: 'home-outline',
    en: {
      name: 'Foundation Builders',
      essence: 'A strong, steady pull — together you build things that last.',
      detail: 'You push each other to build — a home, savings, a family. Strong teamwork; just make sure you also rest and laugh together, not only work.',
    },
    si: {
      name: 'අත්තිවාරම් හදන්නෝ',
      essence: 'ශක්තිමත්, ස්ථාවර ඇදීමක් — එකට ඔබ කල් පවතින දේවල් ගොඩනඟනවා.',
      detail: 'ගෙයක්, ඉතුරුම්, පවුලක් — එකට ගොඩනඟන්න මේ බැඳීම හොඳටම උදව් වෙනවා. ඒත් හැම විටම වැඩම නොවී, එකට විවේක ගන්නත් හිනා වෙන්නත් මතක තබාගන්න.',
    },
  },
  magnetic_poles: {
    band: 'magnetic', emblem: 'magnet-outline',
    en: {
      name: 'Magnetic Poles',
      essence: 'You are quite different, yet strongly drawn to each other — a spark worth looking after.',
      detail: 'Very different people, very strong spark. The difference itself is the attraction — so don’t try to fully change each other; try to understand instead.',
    },
    si: {
      name: 'චුම්භක ධ්‍රැව',
      essence: 'දෙදෙනා තරමක් වෙනස්, ඒත් ප්‍රබලව එකිනෙකාට ඇදෙනවා — රැකගත යුතු ගිනිපුපුරක්.',
      detail: 'ගොඩක් වෙනස් දෙදෙනෙක්, ඒත් ඇදීම ඉතා ප්‍රබලයි. ඒ වෙනසමයි ආකර්ෂණය — ඒ නිසා එකිනෙකාව සම්පූර්ණයෙන් වෙනස් කරන්න හදන්න එපා; තේරුම් ගන්න උත්සාහ කරන්න.',
    },
  },
  two_halves: {
    band: 'magnetic', emblem: 'sync-outline',
    en: {
      name: 'Two Halves, One Whole',
      essence: 'Natural opposites who complete each other — where one is soft, the other is strong.',
      detail: 'What one of you lacks, the other has. Decisions work best when both speak first and decide together — otherwise one voice slowly takes over.',
    },
    si: {
      name: 'අඩ දෙකක්, එක මුළුවක්',
      essence: 'එකිනෙකා සම්පූර්ණ කරන ප්‍රතිවිරුද්ධ දෙදෙනෙක් — එක් අයෙක් මෘදු තැන අනෙකා ශක්තිමත්.',
      detail: 'එක් අයෙකුට අඩු දේ අනෙකා ළඟ තිබෙනවා. තීරණ ගනිද්දී දෙදෙනාම කතා කර එකට තීරණය කරන්න — නැත්නම් එක් අයෙකුගේ කැමැත්තම හෙමින් ඉදිරියට එනවා.',
    },
  },
  anchor_and_tide: {
    band: 'magnetic', emblem: 'boat-outline',
    en: {
      name: 'Anchor and Tide',
      essence: 'One of you steadies, the other brings movement — together you get both calm and life.',
      detail: 'One brings calm, the other brings energy. It works beautifully when you value each other’s role, instead of wishing the other were like you.',
    },
    si: {
      name: 'නැංගුරමයි රළයි',
      essence: 'එක් අයෙක් ස්ථාවර කරනවා, අනෙකා ජීවය ගේනවා — එකට සිටින විට දෙකම ලැබෙනවා.',
      detail: 'එක් අයෙක් සන්සුන්කම ගේනවා, අනෙකා උද්‍යෝගය ගේනවා. අනෙකා තමන් වගේම විය යුතුයි කියා නොසිතා, ඒ වෙනස අගය කරන විට මේ බැඳීම ලස්සනට වැඩ කරනවා.',
    },
  },
  companions_allies: {
    band: 'balanced', emblem: 'people-outline',
    en: {
      name: 'Companions & Allies',
      essence: 'Best friends first — you cheer each other on and win as a team.',
      detail: 'Friendship is the base here — you truly enjoy each other’s wins. Keep a few shared dreams too, so you both grow in the same direction.',
    },
    si: {
      name: 'මිතුරු සගයෝ',
      essence: 'මුලින්ම හොඳම මිතුරෝ — එකිනෙකාව දිරිමත් කරමින් කණ්ඩායමක් ලෙස දිනනවා.',
      detail: 'මේ බැඳීමේ පදනම මිත්‍රත්වයයි — එකිනෙකාගේ ජයග්‍රහණවලට ඇත්තටම සතුටු වෙනවා. පොදු සිහින කිහිපයකුත් තබාගන්න — එවිට දෙදෙනාම එකම දිශාවට වැඩෙනවා.',
    },
  },
  two_paths_meeting: {
    band: 'balanced', emblem: 'git-merge-outline',
    en: {
      name: 'Two Paths, One Meeting',
      essence: 'Two independent journeys that make each other richer — space plus shared goals keep it strong.',
      detail: 'You each have your own path, and here that is healthy. Plan regular time together on purpose — or the two paths can slowly drift apart.',
    },
    si: {
      name: 'පාරවල් දෙකක එක් හමුවක්',
      essence: 'ස්වාධීන ගමන් දෙකක් එකිනෙකා පොහොසත් කරනවා — ඉඩ සහ පොදු අරමුණු බැඳීම රැකගන්නවා.',
      detail: 'දෙදෙනාටම තම තමන්ගේ ගමනක් තිබෙනවා — මෙතැනදී ඒක හොඳ දෙයක්. ඒත් හිතාමතාම එකට කාලය වෙන් කරගන්න — නැත්නම් පාරවල් දෙක හෙමින් දුරස් විය හැකියි.',
    },
  },
  giving_bond: {
    band: 'balanced', emblem: 'gift-outline',
    en: {
      name: 'The Giving Bond',
      essence: 'A bond of quiet giving and receiving — devotion that deepens with time.',
      detail: 'One of you quietly gives a lot. That is beautiful — as long as the giving flows both ways. Check in with each other often, so no one feels unseen.',
    },
    si: {
      name: 'දෙන-ලබන බැම්ම',
      essence: 'නිහඬව දෙන-ලබන බැඳීමක් — කාලයත් සමඟ කැපවීම ගැඹුරු වෙනවා.',
      detail: 'මේ බැඳීමේ එක් අයෙක් නිහඬව ගොඩක් දෙනවා. ඒක ලස්සනයි — ඒත් දීම දෙපැත්තටම ගලා යා යුතුයි. කාටවත් අගයක් නොදැනී ඉන්නවාද කියා ඉඳහිට අහලා බලන්න.',
    },
  },
  river_to_sea: {
    band: 'balanced', emblem: 'trail-sign-outline',
    en: {
      name: 'River Meeting the Sea',
      essence: 'Different natures flowing toward the same future — you complete each other’s journey.',
      detail: 'Different styles, same destination. Agree on the big things — home, family, values — and the difference in style stops mattering.',
    },
    si: {
      name: 'ගඟ මුහුද හමුවීම',
      essence: 'වෙනස් ස්වභාව දෙකක් එකම අනාගතයක් කරා ගලනවා — එකිනෙකාගේ ගමන සම්පූර්ණ කරනවා.',
      detail: 'විදි දෙකක්, ඒත් යන්නේ එකම තැනකට. ලොකු දේවල් ගැන එකඟ වෙන්න — ගෙදර, පවුල, වටිනාකම් — එවිට විදියේ වෙනස ප්‍රශ්නයක් වෙන්නේ නැහැ.',
    },
  },
  sacred_forge: {
    band: 'growth', emblem: 'hammer-outline',
    en: {
      name: 'The Sacred Forge',
      essence: 'An intense bond that changes you both — it grows well when you stay honest and aware.',
      detail: 'This bond will change you both. It rewards honesty — name problems early and kindly, and this becomes one of the deepest matches there is.',
    },
    si: {
      name: 'පූජනීය කම්මල',
      essence: 'දෙදෙනාම වෙනස් කරන තීව්‍ර බැඳීමක් — අවංකව, දැනුවත්ව සිටින විට හොඳින් වැඩෙනවා.',
      detail: 'මේ බැඳීම දෙදෙනාවම වෙනස් කරනවා. එය අවංකකමට හොඳින් ප්‍රතිචාර දක්වනවා — ප්‍රශ්න කලින්ම, කරුණාවෙන් කතා කළොත්, මේක ගැඹුරුම ගැළපීම්වලින් එකක් වෙනවා.',
    },
  },
  karmic_depths: {
    band: 'growth', emblem: 'planet-outline',
    en: {
      name: 'Karmic Depths',
      essence: 'A deep pull that feels fated — its depth is the gift, and patient effort is the price.',
      detail: 'A pull that feels deep and fated. Take it slowly — this bond grows best with patience, honesty and time, not speed.',
    },
    si: {
      name: 'කර්ම ගැඹුර',
      essence: 'පෙර බැඳීමක් වගේ දැනෙන ගැඹුරු ඇදීමක් — ගැඹුර තෑග්ගයි, ඉවසිලිවන්ත උත්සාහය එහි මිලයි.',
      detail: 'පෙර සම්බන්ධයක් වගේ දැනෙන ගැඹුරු ඇදීමක්. හදිසි වෙන්න එපා — මේ බැඳීම හොඳින්ම වැඩෙන්නේ ඉවසීමෙන්, අවංකකමෙන්, කාලයත් සමඟයි.',
    },
  },
};

function relationshipClass(diff) {
  if (diff === 0) return 'same';
  if (diff === 4 || diff === 8) return 'trine';
  if (diff === 3 || diff === 9) return 'kendra';
  if (diff === 6) return 'seventh';
  if (diff === 2 || diff === 10) return 'eleventh';
  if (diff === 1 || diff === 11) return 'twelfth';
  return 'shadashtaka';
}

function pairTone(a, b) {
  var ea = ELEMENT[a], eb = ELEMENT[b];
  if (ea === 'water' || eb === 'water') return 'deep';
  if (ea === 'earth' || eb === 'earth') return 'grounded';
  return 'warm';
}

var SELECT = {
  same:        { warm: 'mirror_souls',        grounded: 'two_lamps',           deep: 'mirror_souls',   _: 'mirror_souls' },
  trine:       { warm: 'blessed_harmony',     grounded: 'blessed_harmony',     deep: 'still_waters',   _: 'blessed_harmony' },
  kendra:      { warm: 'foundation_builders', grounded: 'foundation_builders', deep: 'magnetic_poles', _: 'foundation_builders' },
  seventh:     { warm: 'two_halves',          grounded: 'anchor_and_tide',     deep: 'anchor_and_tide', _: 'two_halves' },
  eleventh:    { warm: 'companions_allies',   grounded: 'two_paths_meeting',   deep: 'two_paths_meeting', _: 'companions_allies' },
  twelfth:     { warm: 'giving_bond',         grounded: 'giving_bond',         deep: 'river_to_sea',   _: 'giving_bond' },
  shadashtaka: { warm: 'sacred_forge',        grounded: 'sacred_forge',        deep: 'karmic_depths',  _: 'karmic_depths' },
};

/**
 * Derive the archetype for a sign pair. Same-sign pairs are supported
 * (they resolve to the mirror archetypes).
 */
export function deriveArchetype(aRashiId, bRashiId, lang) {
  var L = lang === 'si' ? 'si' : 'en';
  var diff = (((bRashiId - aRashiId) % 12) + 12) % 12;
  var cls = relationshipClass(diff);
  var tone = pairTone(aRashiId, bRashiId);
  var id = (SELECT[cls] && (SELECT[cls][tone] || SELECT[cls]._)) || 'companions_allies';
  var arc = ARCHETYPES[id];
  var band = BANDS[arc.band];
  return {
    id: id,
    band: arc.band,
    bandRank: band.rank,
    bandLabel: band[L],
    bandColor: band.color,
    bandGradient: band.gradient,
    name: arc[L].name,
    essence: arc[L].essence,
    detail: arc[L].detail,
    emblem: arc.emblem,
    isSame: aRashiId === bRashiId,
  };
}

/**
 * Build the 12-lagna explorer grouped into the four reframed bands
 * (strongest → growth). Includes the user's own sign flagged `isSame`.
 */
export function buildLagnaExplorer(myRashiId, lang) {
  var L = lang === 'si' ? 'si' : 'en';
  var order = ['harmony', 'magnetic', 'balanced', 'growth'];
  var groups = {};
  order.forEach(function (k) { groups[k] = { key: k, label: BANDS[k][L], color: BANDS[k].color, gradient: BANDS[k].gradient, rank: BANDS[k].rank, items: [] }; });
  for (var i = 1; i <= 12; i++) {
    var arc = deriveArchetype(myRashiId, i, L);
    groups[arc.band].items.push({ rashiId: i, archetypeId: arc.id, name: arc.name, essence: arc.essence, detail: arc.detail, emblem: arc.emblem, isSame: i === myRashiId });
  }
  return order.map(function (k) { return groups[k]; }).filter(function (g) { return g.items.length > 0; });
}
