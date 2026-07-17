/**
 * Onboarding Reveal — template content + composition
 *
 * Deterministic, chart-specific narrative shown to a NEW user immediately
 * after they enter their birth details (before sign-in, before paywall).
 * No AI calls: the engine computes their real lagna / nakshatra / dasha,
 * and this module composes hand-written Sinhala + English copy blocks
 * into a personal "identity read" plus locked "future cards" whose titles
 * carry REAL dates from their Vimshottari timeline.
 *
 * VOICE: a warm, knowing astrologer speaking directly to the person using the
 * respectful second-person "ඔබ" — an elevated yet personal register that
 * matches the onboarding story voice (not cold textbook prose).
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════════
//  LAGNA (ASCENDANT) IDENTITY READS — 12 signs × 2 languages
// ═══════════════════════════════════════════════════════════════════════

const LAGNA_READS = {
  Mesha: {
    en: {
      title: 'Born under a warrior sky',
      text: 'Your ascendant is Mesha — the first fire of the zodiac rose on the eastern horizon at the moment you were born. People like you don’t wait for permission: you move first, feel restless when others hesitate, and recover from setbacks faster than almost anyone around you. Your challenge was never courage — it’s patience.',
    },
    si: {
      title: 'ගින්දරක් අරගෙන ආපු කෙනෙක්',
      text: 'ඔබේ ලග්නය මේෂ. ඇත්ත කියන්නද? ඔබ අවසර ඉල්ලගෙන ඉන්න ජාතියේ කෙනෙක් නෙමෙයි. අනිත් අය තාම හිත හිතා ඉන්නකොට ඔබ ගිහින් ඉවරයි. වැටුණත් ඉක්මනට නැගිටිනවා — ඒක ඔබේ ලේවල තියෙන දෙයක්. ධෛර්යය ගැන ඔබට කවදාවත් ප්‍රශ්නයක් තිබුණේ නෑ. තියෙන එකම ප්‍රශ්නය ඉවසීම විතරයි.',
    },
  },
  Vrishabha: {
    en: {
      title: 'Born under a steady golden sky',
      text: 'Your ascendant is Vrishabha — Venus was shaping the horizon when you arrived. You build slowly and permanently: trust, money, skills, love. People underestimate your quiet stubbornness until they realise everything you’ve ever truly wanted, you eventually got. Comfort isn’t laziness for you — it’s fuel.',
    },
    si: {
      title: 'හෙමින් හදලා සදාකාලෙට තියන කෙනෙක්',
      text: 'ඔබේ ලග්නය වෘෂභ. ඔබ දේවල් හදන්නේ හෙමින් — ඒත් හදපු දේ කවදාවත් කඩන් වැටෙන්නේ නෑ. විශ්වාසය, සල්ලි, ආදරේ… ඔක්කොම එහෙමයි. මිනිස්සු ඔබේ නිහඬ දැඩිකම හෑල්ලුවට ගන්නවා — ඒත් හොඳට බැලුවොත්, ඔබට ඇත්තටම ඕන වුණු දේවල් ඔක්කොම අන්තිමට ඔබ ළඟ. ඒක අහම්බයක් නෙමෙයි.',
    },
  },
  Mithuna: {
    en: {
      title: 'Born under a quicksilver sky',
      text: 'Your ascendant is Mithuna — Mercury’s twin currents were crossing the horizon at your birth. Your mind runs on two tracks at once: you can charm a room and analyse it at the same time. Words are your native element, and boredom is the only thing you’ve ever truly feared.',
    },
    si: {
      title: 'එකපාර දෙපැත්තට හිතන්න පුළුවන් කෙනෙක්',
      text: 'ඔබේ ලග්නය මිථුන. ඔබේ ඔළුව දුවන්නේ එකපාර පාරවල් දෙකක. කාමරේක ඉන්න ඔක්කොමලව හිනස්සවන ගමන්ම, ඔබ ඇතුළතින් ඒ හැමෝවම කියවනවා — දෙකම එකපාර. වචන කියන්නේ ඔබේ ලෝකේ. ඔබ ඇත්තටම බය එක දේකට විතරයි — කම්මැලිකමට.',
    },
  },
  Kataka: {
    en: {
      title: 'Born under a moonlit sky',
      text: 'Your ascendant is Kataka — the Moon herself ruled the horizon at your birth. You feel rooms before you enter them and remember kindnesses others forgot years ago. Your protectiveness of the people you love is quiet but absolute — and those who mistake your softness for weakness never make that mistake twice.',
    },
    si: {
      title: 'හඳ රැකවරණය ලැබුණු කෙනෙක්',
      text: 'ඔබේ ලග්නය කටක — ඔබ ඉපදෙනකොට ක්ෂිතිජය පාලනය කළේ හඳමයි. කාමරේකට යන්න කලින්ම ඒකේ හුළං ඔබට දැනෙනවා. අවුරුදු ගාණකට ඉස්සර කවුරුහරි කරපු හොඳක් ඔබට තාම මතකයි. ඔබ ආදරේ කරන මිනිස්සුන්ව ඔබ රකින්නේ නිශ්ශබ්දව — ඒත් ඒ මෘදුකම දුර්වලකමක් කියලා හිතපු කෙනෙක් ඒ වැරැද්ද දෙපාරක් කරන්නේ නෑ.',
    },
  },
  Simha: {
    en: {
      title: 'Born under a royal sky',
      text: 'Your ascendant is Simha — the Sun’s own sign was rising when you took your first breath. You were built for visibility: rooms reorganise themselves around your presence whether you ask them to or not. Your true test in this life is not winning attention — it’s choosing what deserves yours.',
    },
    si: {
      title: 'ඉපදුණේම රජ වෙන්න',
      text: 'ඔබේ ලග්නය සිංහ — ඔබ පළවෙනි හුස්ම ගන්නකොට උදාවෙමින් තිබුණේ ඉරගේම රාශිය. ඔබ කාමරේකට ආවම ඒක වෙනස් වෙනවා — ඔබ ඉල්ලුවත් නැතත්. මිනිස්සුන්ගේ ඇස් ඔබ ළඟට එනවා. ඒත් මෙන්න ඇත්ත: ඔබේ ජීවිතේ පරීක්ෂණය අවධානය දිනාගන්න එක නෙමෙයි. ඔබේ අවධානය දෙන්න වටින දේ තෝරගන්න එකයි.',
    },
  },
  Kanya: {
    en: {
      title: 'Born under a discerning sky',
      text: 'Your ascendant is Kanya — Mercury’s precise light governed your first horizon. You see the flaw in the plan before anyone else has finished reading it, and your standards — for work, for people, for yourself — quietly exhaust those who can’t keep up. Perfectionism is your gift wearing a disguise.',
    },
    si: {
      title: 'අනිත් අයට පේන්නේ නැති දේ පේන කෙනෙක්',
      text: 'ඔබේ ලග්නය කන්‍යා. සැලසුමක අඩුපාඩුව ඔබට පේනවා — අනිත් අය ඒක කියවලා ඉවර වෙන්නත් කලින්. ඔබේ ප්‍රමිතිය ටිකක් උසයි — වැඩට, මිනිස්සුන්ට, ඔබටම. සමහරුන්ට ඒක මහන්සියි. ඒත් දන්නවද? ඒ පරිපූර්ණකම කියන්නේ වෙස් ඇඳගත්තු ඔබේ තෑග්ග.',
    },
  },
  Tula: {
    en: {
      title: 'Born under a balanced sky',
      text: 'Your ascendant is Tula — Venus was weighing the horizon into harmony at your birth. You are the person people call when two sides stop talking; fairness isn’t a value you chose, it’s a reflex you were born with. Your lifelong lesson: the peace you make for everyone else, you must also learn to keep for yourself.',
    },
    si: {
      title: 'දෙපැත්තක් යාකරන්න ඉපදුණු කෙනෙක්',
      text: 'ඔබේ ලග්නය තුලා. දෙන්නෙක් කතා නොකර ඉන්නකොට දෙගොල්ලොම කතා කරන්නේ ඔබට — ඒක වෙනවා නේද? සාධාරණකම කියන්නේ ඔබ තෝරගත්තු දෙයක් නෙමෙයි, ඔබ ඉපදුණු හැටි. ඒත් මතක තියාගන්න: අනිත් ඔක්කොමලට හදලා දෙන ඒ සාමය, ටිකක් ඔබ වෙනුවෙනුත් ඉතුරු කරගන්න.',
    },
  },
  Vrischika: {
    en: {
      title: 'Born under a deep-water sky',
      text: 'Your ascendant is Vrischika — Mars was moving through hidden depths when you were born. You read people’s unspoken motives the way others read headlines, and you have survived things you never told anyone about. Your intensity isn’t a flaw to soften — it’s the exact instrument your life will demand.',
    },
    si: {
      title: 'ගැඹුරු වතුරේ හැදුණු කෙනෙක්',
      text: 'ඔබේ ලග්නය වෘශ්චික. මිනිස්සු පත්තරේ සිරස්තල කියවනවා වගේ ඔබ මිනිස්සුන්ගේ නොකියපු හිත් කියවනවා. ඔබ ජයගත්තු දේවල් තියෙනවා — කාටවත් කියලා නැති ඒවා. මං දන්නවා. ඒ තද ගතිය මෘදු කරගන්න ඕන දෙයක් නෙමෙයි — ඒක තමයි ඔබේ ජීවිතේ ඉල්ලන්න යන ආයුධය.',
    },
  },
  Dhanus: {
    en: {
      title: 'Born under an archer’s sky',
      text: 'Your ascendant is Dhanus — Jupiter’s arrow was aimed at the horizon when you arrived. You think in horizons, not fences: bigger questions, farther places, larger meanings. People feel more optimistic simply standing near you — your real work is learning to aim that fire at one target at a time.',
    },
    si: {
      title: 'වැට ළඟ නවතින්නේ නැති කෙනෙක්',
      text: 'ඔබේ ලග්නය ධනු. ඔබ හිතන්නේ වැටවල් වලින් නෙමෙයි — ක්ෂිතිජ වලින්. ලොකු ප්‍රශ්න, දුර තැන්, ලොකු තේරුම්. ඔබ ළඟ ඉන්නකොටම මිනිස්සුන්ට හිත සැහැල්ලු වෙනවා — ඒක ඔබ දන්නවද කොහෙද? ඔබට කරන්න තියෙන එකම වැඩේ: ඒ ගින්දර වරකට එක ඉලක්කයකට අල්ලන එක.',
    },
  },
  Makara: {
    en: {
      title: 'Born under a mountain sky',
      text: 'Your ascendant is Makara — Saturn was building slow architecture on your horizon at birth. You were probably called "mature for your age" before you understood what it meant. You outlast, outwork and outplan everyone — and life, for people born under Makara, famously gets better with every decade.',
    },
    si: {
      title: 'කන්දක් වගේ හෙමින් උස වෙන කෙනෙක්',
      text: 'ඔබේ ලග්නය මකර. පොඩි කාලේ ඉඳන්ම "වයසට වඩා ලොකුයි" කියලා අහලා ඇති නේද? ඒකේ තේරුම දැනගන්නත් කලින්. ඔබ හැමෝටම වඩා දුර යනවා, වැඩිපුර වැඩ කරනවා, දුර බලනවා. මකර ලග්නෙට තියෙන පොරොන්දුවක් තියෙනවා — අවුරුදු දහයෙන් දහයට ජීවිතේ ලස්සන වෙනවා. ඒක වෙනවාමයි.',
    },
  },
  Kumbha: {
    en: {
      title: 'Born under a future sky',
      text: 'Your ascendant is Kumbha — Saturn’s far-seeing air sign crowned your horizon. You have always felt slightly ahead of your surroundings, seeing systems where others see situations. Convention bores you not out of rebellion but because you can already see the better version no one has built yet.',
    },
    si: {
      title: 'කාලෙට ටිකක් ඉස්සරහින් ආපු කෙනෙක්',
      text: 'ඔබේ ලග්නය කුම්භ. ඔබට හැමදාම දැනිලා ඇති — ඔබ ඉන්නේ වටේ ඉන්න අයට වඩා පොඩ්ඩක් ඉස්සරහින් කියලා. අනිත් අයට ප්‍රශ්නයක් පේනකොට ඔබට පේන්නේ ඒකේ රටාව. පරණ විදිහට වැඩ කරන්න ඔබට කම්මැලියි — කැරලි ගහන්න නෙමෙයි. කවුරුත් තාම හදලා නැති හොඳම විදිහ ඔබට දැනටමත් පේන නිසා.',
    },
  },
  Meena: {
    en: {
      title: 'Born under an ocean sky',
      text: 'Your ascendant is Meena — Jupiter’s deepest waters met the horizon at your first breath. You absorb the feelings of every room you enter, dream in ways you can’t always explain, and sense turns of fate before they arrive. The world calls it imagination. Jyotish calls it the oldest form of knowing.',
    },
    si: {
      title: 'දේවල් වෙන්න කලින් දැනෙන කෙනෙක්',
      text: 'ඔබේ ලග්නය මීන. කාමරේක හුළං ඔබට දැනෙනවා — ඇතුළට යනකොටම. පැහැදිලි කරන්න බැරි හීන ඔබ දකිනවා. දේවල් වෙන්න කලින් මොකක්දෝ දැනීමක් එනවා නේද? ලෝකේ ඒකට කියන්නේ පරිකල්පනය කියලා. ජ්‍යොතිෂය ඒකට කියන්නේ දැනගැනීමේ පැරණිම විදිහ කියලා.',
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════
//  NAKSHATRA READS — 27 birth stars × 2 languages
// ═══════════════════════════════════════════════════════════════════════

const NAKSHATRA_READS = {
  Ashwini: {
    en: { title: 'The star of the healers', text: 'Your Moon rests in Ashwini, the star of the divine physicians. You begin things faster than others dare, and people instinctively come to you to be fixed — problems, plans, sometimes hearts.' },
    si: { title: 'සුව කරන්නන්ගේ තරුව', text: 'ඔබේ හඳ ඉන්නේ අස්විද නැකතේ — දෙවියන්ගේ වෛද්‍යවරුන්ගේ තරුවේ. මොකක්හරි කැඩුණම මිනිස්සු එන්නේ ඔබ ළඟට — ප්‍රශ්න, සැලසුම්, සමහර වෙලාවට හිත්. ඒක ඉබේම වෙන දෙයක්. ඔබටත් ඒක දැනිලා ඇති.' },
  },
  Bharani: {
    en: { title: 'The star of fierce becoming', text: 'Your Moon rests in Bharani, the star that carries life through its hardest passages. You endure what breaks others and transform it into strength — nothing about you is half-lived.' },
    si: { title: 'දරාගෙන දිනන තරුව', text: 'ඔබේ හඳ භරණි නැකතේ. අනිත් අයව කඩන් වට්ටන දේවල් ඔබ දරාගන්නවා — දරාගෙන විතරක් නෙමෙයි, ඒවා ශක්තිය කරගන්නවා. ඔබේ ජීවිතේ භාගෙට කරපු එක දෙයක්වත් නෑ. ඒක තමයි ඔබේ ලකුණ.' },
  },
  Krittika: {
    en: { title: 'The star of the sacred flame', text: 'Your Moon rests in Krittika, the cutting flame. You see through pretense instantly, and your honesty — sometimes sharp — is the reason the people who matter trust you completely.' },
    si: { title: 'බොරු පුච්චන ගිනි තරුව', text: 'ඔබේ හඳ කැති නැකතේ — කපන ගිනිදැල්ලේ. බොරු වෙස් ඔබට එකපාරම පේනවා. ඔබේ ඇත්ත කතාව සමහර වෙලාවට කැපෙනවා තමයි — ඒත් ඒක නිසාම තමයි වටින මිනිස්සු ඔබව සීයට සීයක් විශ්වාස කරන්නේ.' },
  },
  Rohini: {
    en: { title: 'The Moon’s most beloved star', text: 'Your Moon rests in Rohini — the one nakshatra the Moon himself loved above all others. Beauty, growth and abundance follow you naturally, and people rarely forget meeting you.' },
    si: { title: 'හඳ වැඩිපුරම ආදරේ කරපු තරුව', text: 'ඔබේ හඳ රෙහෙන නැකතේ. දන්නවද — නැකැත් විසිහතෙන් හඳ වැඩිපුරම ආදරේ කළේ මේකට. ලස්සන, වැඩීම, සරුබව ඔබ පස්සෙන් ඉබේම එනවා. ඔබව එකපාරක් හම්බවුණු කෙනෙක්ට ඔබව අමතක වෙන්නේ අමාරුවෙන්.' },
  },
  Mrigashira: {
    en: { title: 'The star of the seeker', text: 'Your Moon rests in Mrigashira, the searching deer. You are a lifelong seeker — of answers, places, people, truths — and your curiosity keeps you younger than your years.' },
    si: { title: 'හොයන්න ඉපදුණු තරුව', text: 'ඔබේ හඳ මුවසිරස නැකතේ — හොයාගෙන යන මුවාගේ තරුවේ. ඔබ ජීවිතේම හොයන කෙනෙක් — උත්තර, තැන්, මිනිස්සු, ඇත්ත. ඒ කුතුහලය නිසාම ඔබ වයසට වඩා තරුණයි. ඒක නවත්තන්න එපා.' },
  },
  Ardra: {
    en: { title: 'The star of the storm', text: 'Your Moon rests in Ardra, the teardrop of the storm god. You feel more deeply than you show, and every storm you’ve weathered has made your mind sharper — Ardra people rebuild better than anyone.' },
    si: { title: 'කුණාටුවෙන් හැදුණු තරුව', text: 'ඔබේ හඳ අද නැකතේ — කුණාටු දෙවියන්ගේ කඳුළු බිංදුවේ. ඔබ පෙන්නනවට වඩා ගොඩක් ගැඹුරට දැනෙනවා. ඒත් මෙන්න රහස: ඔබ පහුකරපු හැම කුණාටුවක්ම ඔබේ ඔළුව තව තියුණු කළා. අද නැකතේ අය ආයෙත් හදන්නේ කලින් තිබුණට වඩා හොඳට.' },
  },
  Punarvasu: {
    en: { title: 'The star of return and renewal', text: 'Your Moon rests in Punarvasu, the star of light returning home. No matter how far life scatters you, you always find your way back — luck genuinely renews itself for you, again and again.' },
    si: { title: 'ආයෙත් පායන තරුව', text: 'ඔබේ හඳ පුනාවස නැකතේ — ආපහු ගෙදර එන එළියේ තරුවේ. ජීවිතේ ඔබව කොච්චර දුර විසි කළත්, ඔබ ආපහු පාර හොයාගන්නවා. ඔබේ වාසනාව ඉවර වෙන්නේ නෑ — ඒක ආයෙත් ආයෙත් අලුත් වෙනවා. ඒක ඔබේ නැකතේ පොරොන්දුව.' },
  },
  Pushya: {
    en: { title: 'The most auspicious star', text: 'Your Moon rests in Pushya — classical Jyotish calls it the single most auspicious of all 27 stars. You nourish everyone around you, and life quietly protects those born under this light.' },
    si: { title: 'නැකැත් විසිහතෙන් සුබම තරුව', text: 'ඔබේ හඳ පුෂ නැකතේ. මේක පොඩි දෙයක් නෙමෙයි — පරණ පොත් කියන්නේ නැකැත් විසිහතෙන්ම සුබම එක මේක කියලා. ඔබ වටේ ඉන්න අයව ඔබ පෝෂණය කරනවා. ඒ වගේම — මේ එළිය යටේ ඉපදුණු අයව ජීවිතේ නිශ්ශබ්දව රකිනවා.' },
  },
  Ashlesha: {
    en: { title: 'The star of the serpent’s wisdom', text: 'Your Moon rests in Ashlesha, the coiled serpent. You perceive what people hide — motives, fears, desires — and once you commit to something, your grip never loosens.' },
    si: { title: 'සර්පයාගේ නුවණ ලැබුණු තරුව', text: 'ඔබේ හඳ අස්ලිය නැකතේ — දඟර ගැහුණු සර්පයාගේ තරුවේ. මිනිස්සු හංගන දේවල් ඔබට පේනවා — බය, ආසාවල්, ඇතුළේ තියෙන ඒවා. ඒ වගේම ඔබ දෙයක් අල්ලගත්තා නම්, ඒ ග්‍රහණය ලිහෙන්නේ නෑ. කවදාවත්.' },
  },
  Magha: {
    en: { title: 'The star of thrones', text: 'Your Moon rests in Magha, the star of royal ancestors. You carry an old dignity that people sense immediately — authority sits naturally on you, and your family line matters to you more than you admit.' },
    si: { title: 'සිංහාසනවල තරුව', text: 'ඔබේ හඳ මා නැකතේ — රජ පරපුරේ තරුවේ. ඔබ ළඟ පරණ ගාම්භීරකමක් තියෙනවා — මිනිස්සුන්ට ඒක එකපාරම දැනෙනවා. නායකකම ඔබට ඉබේම එනවා. ඒ වගේම ඔබේ පවුල, ඔබේ පරපුර — ඒවා ඔබට කියනවට වඩා වටිනවා. ඇත්ත නේද?' },
  },
  'Purva Phalguni': {
    en: { title: 'The star of golden pleasure', text: 'Your Moon rests in Purva Phalguni, the star of rest and delight. You were born knowing how to enjoy life — and your warmth draws people in effortlessly. Love and creativity are not luxuries for you; they are your engine.' },
    si: { title: 'ජීවිතේ රස දන්නා තරුව', text: 'ඔබේ හඳ පුවපල් නැකතේ — සැපේ සහ සතුටේ තරුවේ. ජීවිතේ භුක්ති විඳින හැටි ඔබ ඉගෙනගත්තේ නෑ — ඒක දැනගෙනම ඉපදුණා. ඔබේ උණුසුමට මිනිස්සු ඉබේම ඇදිලා එනවා. ආදරේ සහ නිර්මාණශීලීකම ඔබට අමතර දේවල් නෙමෙයි — ඒවා තමයි ඔබේ එන්ජිම.' },
  },
  'Uttara Phalguni': {
    en: { title: 'The star of the generous vow', text: 'Your Moon rests in Uttara Phalguni, the star of contracts kept. Your word, once given, is iron. People build their plans on your reliability — and prosperity comes to you through partnerships you honour.' },
    si: { title: 'දුන්නු වචනේ රකින තරුව', text: 'ඔබේ හඳ උත්‍රපල් නැකතේ. ඔබ වචනයක් දුන්නා නම් — ඒක යකඩ. මිනිස්සු ඔවුන්ගේ සැලසුම් හදන්නේ ඔබේ විශ්වාසය උඩ. ඒක පොඩි දෙයක් නෙමෙයි. ඔබට සමෘද්ධිය එන්නේ ඔබ ගරු කරන හවුල්කම් හරහා — ඒ නිසා හවුල්කාරයෝ පරිස්සමට තෝරගන්න.' },
  },
  Hasta: {
    en: { title: 'The star of the skilled hand', text: 'Your Moon rests in Hasta, the star of the craftsman’s hand. Whatever you touch, you improve — you have a rare gift for turning ideas into real, finished things while others are still talking.' },
    si: { title: 'රන් අත ලැබුණු තරුව', text: 'ඔබේ හඳ හත නැකතේ — ශිල්පියාගේ අතේ තරුවේ. ඔබ අල්ලපු දේ ලස්සන වෙනවා. අනිත් අය තාම කතා කරනකොට ඔබ ඒක හදලා ඉවරයි — ඒ තෑග්ග හැමෝටම ලැබෙන එකක් නෙමෙයි. ඔබේ අත් දෙක ඔබේ දෛවය.' },
  },
  Chitra: {
    en: { title: 'The star of the celestial architect', text: 'Your Moon rests in Chitra, the jewel of the sky’s own architect. You cannot help making things beautiful — your work, your home, your presence. Ordinary is the one thing you’ve never produced.' },
    si: { title: 'අහසේ නිර්මාණ ශිල්පියාගේ මැණික', text: 'ඔබේ හඳ සිත නැකතේ — අහසේම නිර්මාණ ශිල්පියාගේ මැණිකේ. දේවල් ලස්සන නොකර ඉන්න ඔබට බෑ — වැඩේ, ගෙදර, ඔබ ඉන්න විදිහ. ඔබ අතින් සාමාන්‍ය දෙයක් හැදිලාම නෑ. බලන්න ආපහු හැරිලා — ඇත්ත නේද?' },
  },
  Swati: {
    en: { title: 'The star of the independent wind', text: 'Your Moon rests in Swati, the single blade of grass that bends in the wind but never breaks. Independence is your oxygen — you flourish exactly when no one is holding your hand.' },
    si: { title: 'තනියම හැදෙන සුළඟේ තරුව', text: 'ඔබේ හඳ සා නැකතේ — සුළඟට නැමෙන ඒත් කවදාවත් කැඩෙන්නේ නැති තණ පතේ. නිදහස කියන්නේ ඔබට හුස්ම වගේ. ඔබ හොඳටම වැඩෙන්නේ කවුරුවත් ඔබේ අත අල්ලගෙන නැති වෙලාවට — ඒක අඩුපාඩුවක් නෙමෙයි, ඒක ඔබේ හැටි.' },
  },
  Vishakha: {
    en: { title: 'The star of the triumphal gate', text: 'Your Moon rests in Vishakha, the star of single-pointed victory. When you decide you want something, the entire architecture of your life reorganises toward it — and you have never permanently lost.' },
    si: { title: 'ජය දොරටුවේ තරුව', text: 'ඔබේ හඳ විසා නැකතේ. ඔබට දෙයක් ඕන කියලා තීරණය කළා නම් — ඉවරයි. ජීවිතේ ඔක්කොම ඒ පැත්තට හැරෙනවා. ආපහු බලන්න: ඔබ ස්ථිරවම පැරදිලා තියෙනවද? නෑ. තාවකාලිකව විතරයි. ඒක තමයි විසා නැකතේ සලකුණ.' },
  },
  Anuradha: {
    en: { title: 'The star of devoted friendship', text: 'Your Moon rests in Anuradha, the star of success through others. You build loyalty the way others build wealth — and it is precisely your friendships that will carry you to places talent alone never could.' },
    si: { title: 'යාළුකමේ බලය දන්නා තරුව', text: 'ඔබේ හඳ අනුර නැකතේ. අනිත් අය සල්ලි එකතු කරනකොට ඔබ එකතු කරන්නේ පක්ෂපාත මිනිස්සු. මතක තියාගන්න — දක්ෂකමට විතරක් යන්න බැරි තැන්වලට ඔබව අරගෙන යන්නේ ඔබේ යාළුකම්. ඒවා රකින්න.' },
  },
  Jyeshtha: {
    en: { title: 'The star of the elder’s crown', text: 'Your Moon rests in Jyeshtha, the eldest star. Responsibility found you early — you protect people quietly, carry more than you show, and possess an authority that never needed a title.' },
    si: { title: 'නොපෙනෙන ඔටුන්නේ තරුව', text: 'ඔබේ හඳ දෙට නැකතේ — වැඩිමල් තරුවේ. වගකීම ඔබව හොයාගත්තේ පොඩි කාලෙම. ඔබ මිනිස්සුන්ව රකින්නේ නිශ්ශබ්දව. පෙන්නනවට වඩා උසුලනවා. ඔබේ නායකකමට කවදාවත් තනතුරක් ඕන වුණේ නෑ — ඒක ඉබේම ආවා.' },
  },
  Mula: {
    en: { title: 'The star of the root', text: 'Your Moon rests in Mula, the root star at the galaxy’s own centre. You are incapable of surface-level living: you dig to the root of every matter, and your life’s pattern is destruction of the false, then rebuilding on truth.' },
    si: { title: 'මුල හොයන තරුව', text: 'ඔබේ හඳ මුල නැකතේ — මන්දාකිණියේම මැද තියෙන මුල් තරුවේ. උඩින් පල්ලෙන් ජීවත් වෙන්න ඔබට බෑ. හැම දේකම මුලටම හාරනවා. ඔබේ ජීවිතේ රටාව මේකයි: බොරු දේවල් කැඩෙනවා — ඊට පස්සේ ඇත්ත උඩ ආයෙත් හැදෙනවා. හැම පාරම කලින්ට වඩා ශක්තිමත්ව.' },
  },
  'Purva Ashadha': {
    en: { title: 'The star of invincible waters', text: 'Your Moon rests in Purva Ashadha, the star of the unconquerable. Your confidence returns like a tide no matter what pulls it away — declare a thing aloud and you have already begun winning it.' },
    si: { title: 'පරදින්න බැරි වතුරේ තරුව', text: 'ඔබේ හඳ පුවසල නැකතේ — පරාජය කරන්න බැරි තරුවේ. ඔබේ ආත්ම විශ්වාසය මුහුදු රළ වගේ — කොච්චර ඇදලා ගත්තත් ආපහු එනවා. දෙයක් හයියෙන් කිව්වා නම් ඔබ ඒක දිනන්න පටන් අරන් ඉවරයි. ඒක ඔබේ රහස් බලය.' },
  },
  'Uttara Ashadha': {
    en: { title: 'The star of the final victory', text: 'Your Moon rests in Uttara Ashadha, the star of the lasting win. Others win battles; you win wars. Your successes come later than most people’s — and last longer than everyone’s.' },
    si: { title: 'අන්තිම ජය ගන්නා තරුව', text: 'ඔබේ හඳ උත්‍රසල නැකතේ. අනිත් අය සටන් දිනනවා — ඔබ දිනන්නේ යුද්ධ. ඔබේ ජයග්‍රහණ එන්නේ ටිකක් පරක්කු වෙලා තමයි. ඒත් මෙන්න වෙනස: ආපු ජය කවදාවත් ආපහු යන්නේ නෑ. ඉවසන්න — ඔබේ කාලේ එනවා.' },
  },
  Shravana: {
    en: { title: 'The star of sacred listening', text: 'Your Moon rests in Shravana, the star of the divine ear. You learn by absorbing what others miss — people confess things to you they’ve told no one, because something in you knows how to truly hear.' },
    si: { title: 'ඇත්තටම අහන්න දන්නා තරුව', text: 'ඔබේ හඳ සුවණ නැකතේ — දිව්‍ය කනේ තරුවේ. අනිත් අයට මගඇරෙන දේවල් ඔබ අහුලගන්නවා. කාටවත් කියලා නැති දේවල් මිනිස්සු ඔබට කියනවා නේද? ඒක අහම්බයක් නෙමෙයි — ඇත්තටම අහන්න දන්නා දෙයක් ඔබ ඇතුළේ තියෙනවා.' },
  },
  Dhanishtha: {
    en: { title: 'The star of the drum of wealth', text: 'Your Moon rests in Dhanishtha, the wealthiest of stars. Rhythm, timing and prosperity are woven into you — you sense the right moment the way musicians sense the beat, and fortune rewards your timing.' },
    si: { title: 'ධනයේ බෙරය ගහන තරුව', text: 'ඔබේ හඳ දෙනට නැකතේ — තරු අතරෙන් ධනවත්ම එකේ. සංගීතකාරයෙක්ට තාලෙ දැනෙනවා වගේ ඔබට හරි වෙලාව දැනෙනවා. ඒ තාලෙට වැඩ කරපු හැම වෙලාවකම වාසනාව ඔබට ගෙවලා තියෙනවා. ඒ දැනීම විශ්වාස කරන්න.' },
  },
  Shatabhisha: {
    en: { title: 'The star of a hundred healers', text: 'Your Moon rests in Shatabhisha, the veiled star of a hundred physicians. You solve what others declare unsolvable, guard your inner world fiercely — and the mysteries that frighten most people are precisely where you feel at home.' },
    si: { title: 'වෙදුන් සීයක රහස් තරුව', text: 'ඔබේ හඳ සියාවස නැකතේ — වෙදුන් සීයක් හංගාගෙන ඉන්න තරුවේ. "මේක විසඳන්න බෑ" කියලා අනිත් අය අතඇරපු දේවල් ඔබ විසඳනවා. ඔබේ ඇතුළේ ලෝකේ ඔබ තදින් රකිනවා. අනිත් අය බය වෙන අභිරහස් — ඒවා තමයි ඔබට ගෙදර වගේ.' },
  },
  'Purva Bhadrapada': {
    en: { title: 'The star of the sacred fire ahead', text: 'Your Moon rests in Purva Bhadrapada, the star of intensity that transforms. You live between two worlds — the practical and the profound — and people sense there is far more burning in you than you ever let show.' },
    si: { title: 'ඇතුළේ ගිනි තියෙන තරුව', text: 'ඔබේ හඳ පුවපුටුප නැකතේ. ඔබ ජීවත් වෙන්නේ ලෝක දෙකක් අතරේ — ප්‍රායෝගික ලෝකේ සහ ගැඹුරු ලෝකේ. මිනිස්සුන්ට දැනෙනවා — ඔබ පෙන්නන ප්‍රමාණයට වඩා ගොඩක් වැඩි දෙයක් ඔබ ඇතුළේ දැවෙනවා කියලා. ඔවුන් දන්නේ භාගයක්වත් නෑ.' },
  },
  'Uttara Bhadrapada': {
    en: { title: 'The star of the deep ocean serpent', text: 'Your Moon rests in Uttara Bhadrapada, the star of depth and restraint. Your calm is not emptiness — it is contained power. People bring you their chaos because your stillness is the rarest thing they know.' },
    si: { title: 'ගැඹුරු මුහුදේ නාගයාගේ තරුව', text: 'ඔබේ හඳ උත්‍රපුටුප නැකතේ. ඔබේ සන්සුන්කම හිස්කමක් නෙමෙයි — ඒක හංගපු බලයක්. මිනිස්සු ඔවුන්ගේ අවුල් ඔක්කොම අරගෙන එන්නේ ඔබ ළඟට. ඇයි දන්නවද? ඔබේ නිශ්චලකම වගේ දෙයක් ඔවුන් වෙන කොහෙවත් දැකලා නැති නිසා.' },
  },
  Revati: {
    en: { title: 'The star of the safe crossing', text: 'Your Moon rests in Revati, the last and gentlest star — the one that guides travellers home. You protect the lost, complete what others abandon, and endings in your hands somehow always become beginnings.' },
    si: { title: 'ගමන් අවසන් කරවන තරුව', text: 'ඔබේ හඳ රේවතී නැකතේ — අන්තිම, මෘදුම තරුවේ. අතරමං වුණු අයව ගෙදර ගෙනියන තරුව මේක. අනිත් අය අතඇරපු දේවල් ඔබ ඉවර කරනවා. ඔබේ අතේදී අවසානයක් කියන්නේ හැමවෙලේම අලුත් පටන්ගැන්මක්. ඒක ඔබේ තෑග්ග.' },
  },
};

// ═══════════════════════════════════════════════════════════════════════
//  MOON RASHI READS — the inner world, 12 signs × 2 languages
// ═══════════════════════════════════════════════════════════════════════

const MOON_READS = {
  Mesha: {
    en: 'Inside, your Moon burns in Mesha — emotions arrive fast, honest and undiluted. You forgive quickly because staying angry bores you.',
    si: 'ඇතුළතින් ඔබේ හඳ දැවෙන්නේ මේෂයේ. හැඟීම් එන්නේ එකපාරට, ඇත්තටම, දියකරලා නෙමෙයි. ඔබ ඉක්මනට සමාව දෙනවා — මොකද තරහ වෙලා ඉන්න එක ඔබට කම්මැලි නිසා.',
  },
  Vrishabha: {
    en: 'Inside, your Moon rests in Vrishabha — the most stable emotional placement of all. People anchor themselves to your calm without realising it.',
    si: 'ඇතුළතින් ඔබේ හඳ වෘෂභයේ — හිතට තියෙන ස්ථාවරම තැන. මිනිස්සු ඔවුන්වම ඔබේ සන්සුන්කමට බැඳගන්නවා — ඔවුන්වත් නොදැන.',
  },
  Mithuna: {
    en: 'Inside, your Moon dances in Mithuna — you process feelings by talking and thinking them through. Silence is never empty for you; it is full of unfinished sentences.',
    si: 'ඇතුළතින් ඔබේ හඳ මිථුනයේ නටනවා. හැඟීම් තේරුම් ගන්න ඔබට කතා කරන්න ඕන — නැත්නම් හිතන්න ඕන. ඔබට නිශ්ශබ්දකම කවදාවත් හිස් නෑ — ඒක පිරිලා තියෙන්නේ ඉවර නොකරපු වාක්‍යවලින්.',
  },
  Kataka: {
    en: 'Inside, your Moon is at home in Kataka — its own sign. Your emotional memory is total: you never forget how something felt, even decades later.',
    si: 'ඇතුළතින් ඔබේ හඳ ඉන්නේ කටකයේ — ඔහුගේම ගෙදර. ඔබේ හිතේ මතකය සම්පූර්ණයි: දෙයක් දැනුණු විදිහ ඔබට අමතක වෙන්නේ නෑ — අවුරුදු විස්සක් ගියත්.',
  },
  Simha: {
    en: 'Inside, your Moon glows in Simha — you feel things theatrically and love with your whole chest. Being overlooked wounds you more than you ever admit.',
    si: 'ඇතුළතින් ඔබේ හඳ සිංහයේ දිලිසෙනවා. ඔබ ආදරේ කරන්නේ මුළු පපුවෙන්ම. ඒත් ඇත්ත කියන්නද? නොසලකා හැරීම ඔබට රිදෙනවා — ඔබ පිළිගන්නවට වඩා ගොඩක් වැඩියෙන්.',
  },
  Kanya: {
    en: 'Inside, your Moon works in Kanya — you soothe anxiety by fixing, organising and being useful. Your care language is quiet acts, not loud words.',
    si: 'ඇතුළතින් ඔබේ හඳ කන්‍යාවේ වැඩ. හිත අවුල් වුණාම ඔබ මොකක්හරි හදනවා, පිළිවෙළ කරනවා. ඔබ ආදරේ පෙන්නන්නේ වචනවලින් නෙමෙයි — නිශ්ශබ්ද වැඩවලින්. දන්න අය ඒක දකිනවා.',
  },
  Tula: {
    en: 'Inside, your Moon balances in Tula — conflict physically drains you, and harmony restores you. You feel other people’s moods as if they were weather.',
    si: 'ඇතුළතින් ඔබේ හඳ තුලාවේ. රණ්ඩු ඔබේ ශරීරයෙන්ම ශක්තිය අදිනවා — සමගිය ඒක ආපහු පුරවනවා. අනිත් අයගේ මනෝභාව ඔබට දැනෙන්නේ කාලගුණේ වගේ — වහිනවද පායනවද කියලා කලින්ම.',
  },
  Vrischika: {
    en: 'Inside, your Moon runs deep in Vrischika — you feel everything at maximum intensity and show almost none of it. Trust, once broken with you, rarely regrows.',
    si: 'ඇතුළතින් ඔබේ හඳ වෘශ්චිකයේ ගැඹුරේ. හැම දෙයක්ම දැනෙන්නේ උපරිමෙන් — පෙන්නන්නේ බින්දුවට කිට්ටු ගාණක්. ඔබ එක්ක විශ්වාසය කැඩුවා නම් — ඒක ආයෙත් හැදෙන්නේ කලාතුරකින්.',
  },
  Dhanus: {
    en: 'Inside, your Moon roams in Dhanus — your spirit needs open horizons, and heaviness lifts the moment you have something to look forward to.',
    si: 'ඇතුළතින් ඔබේ හඳ ධනුවේ සැරිසරනවා. ඔබේ හිතට විවෘත අහසක් ඕන. බලාපොරොත්තු වෙන්න දෙයක් ලැබුණු ගමන් — හිතේ බර එකපාරම අඩු වෙනවා. ඒක ඔබේ බෙහෙත.',
  },
  Makara: {
    en: 'Inside, your Moon climbs in Makara — you carry feelings the way mountains carry snow: silently, and more than anyone can see.',
    si: 'ඇතුළතින් ඔබේ හඳ මකරයේ නගිනවා. කඳු හිම උසුලනවා වගේ ඔබ හැඟීම් උසුලනවා — නිශ්ශබ්දව, කාටවත් පේනවට වඩා ගොඩක් වැඩියෙන්. ඒ බර දන්නේ ඔබ විතරයි.',
  },
  Kumbha: {
    en: 'Inside, your Moon orbits in Kumbha — you need mental space the way others need affection, and your kindness is broadest exactly where it is least personal.',
    si: 'ඇතුළතින් ඔබේ හඳ කුම්භයේ කැරකෙනවා. අනිත් අයට ආදරේ ඕන වගේ ඔබට ඕන හිතට ඉඩ. ඒක වැරැද්දක් නෙමෙයි — ඒ ඉඩේ තමයි ඔබේ හොඳම කල්පනා හැදෙන්නේ.',
  },
  Meena: {
    en: 'Inside, your Moon swims in Meena — the boundary between your feelings and everyone else’s is thin, which is both your greatest gift and the thing you most need to guard.',
    si: 'ඇතුළතින් ඔබේ හඳ මීනයේ පීනනවා. ඔබේ හැඟීම් සහ අනුන්ගේ හැඟීම් අතරේ තියෙන්නේ තුනී වැස්මක් විතරයි. ඒක ඔබේ ලොකුම තෑග්ග — ඒ වගේම ඔබ වැඩිපුරම පරිස්සම් වෙන්න ඕන දේත් ඒකමයි.',
  },
};

// ═══════════════════════════════════════════════════════════════════════
//  DASHA WINDOW GUIDANCE — actionable, per lord × 2 languages.
//  Shown FREE for the currently-open window; future windows stay locked.
// ═══════════════════════════════════════════════════════════════════════

const DASHA_GUIDANCE = {
  Sun: {
    en: 'Step into visibility now: ask for the title, take the stage, put your name on the work. Repair anything unresolved with your father or a mentor — the Sun settles those accounts in this window.',
    si: 'දැන් හැංගිලා ඉන්න එපා: තනතුර ඉල්ලන්න, ඉස්සරහට එන්න, ඔබේ වැඩේට ඔබේ නම දාන්න. තාත්තා එක්ක හරි ගුරුවරයෙක් එක්ක හරි විසඳගන්න දෙයක් තියෙනවා නම් — මේ කාලේ ඒක හදාගන්න. රවි ඒ ගණන් මේ කවුළුවේදී පියවනවා.',
  },
  Moon: {
    en: 'Guard your sleep and your peace above everything — your intuition is the sharpest tool you own right now. Home matters (moves, family, mother) come to a head in this window; soften rather than fight.',
    si: 'නින්ද සහ හිතේ සාමය — ඒ දෙක හැම දේටම වඩා රකින්න. ඔබේ ඇතුළේ දැනීම දැන් තියෙන තියුණුම ආයුධය. ගෙදර කතා (මාරුවීම්, පවුල, අම්මා) මේ කාලේ මතුවෙනවා — රණ්ඩු කරන්න යන්න එපා, මෘදු වෙන්න. දිනන්නේ එතකොටයි.',
  },
  Mars: {
    en: 'Channel the fire deliberately: start the fitness habit, close the property deal, have the brave conversation. Left unaimed, Mars turns to quarrels — pick your one battle and win it.',
    si: 'මේ ගින්දර හරි තැනට අල්ලන්න: ව්‍යායාම පටන් ගන්න, ඉඩම් වැඩේ ඉවර කරන්න, කරන්න බය වෙච්ච කතාව කරන්න. ඉලක්කයක් නැති කුජ රණ්ඩුවලට හැරෙනවා — ඒක වෙන්න දෙන්න එපා. එක සටනක් තෝරන්න, ඒක දිනන්න.',
  },
  Mercury: {
    en: 'Sign, negotiate, publish, learn — paper and words are charged for you now. The side income you have been postponing? This window is precisely when it takes root.',
    si: 'අත්සන් කරන්න, කතා කරලා වැඩේ ගොඩදාගන්න, ඉගෙනගන්න — කඩදාසි සහ වචන දැන් ඔබට පැත්තෙන්. කල් දාපු ඒ අමතර ආදායමේ වැඩේ තියෙනවා නේද? ඒක පටන් ගන්න වෙලාව හරියටම මේකයි. පස්සේ කිව්වා කියන්න එපා.',
  },
  Jupiter: {
    en: 'Say yes to expansion: the course, the marriage talk, the bigger role, the blessing you almost don’t dare ask for. Jupiter repays faith shown during his own window many times over.',
    si: 'ලොකු දේවල්වලට "හා" කියන්න: ඒ පාඨමාලාව, විවාහ කතාව, ලොකු තනතුර — ඉල්ලන්න බය ආශීර්වාදෙත් ඉල්ලන්න. ගුරුගේ කාලේ පෙන්නපු විශ්වාසය ගුරු ආපහු ගෙවන්නේ කිහිප ගුණයකින්. මේක ඒ කාලේ.',
  },
  Venus: {
    en: 'Invest in beauty, love and comfort without guilt — this is the window where relationships deepen and money flows through what delights people. Propose, redecorate, launch the creative thing.',
    si: 'ලස්සනට, ආදරේට, සැපට වියදම් කරන්න — පව් හිතෙන්නේ නැතුව. සම්බන්ධකම් ගැඹුරු වෙන, මිනිස්සුන්ව සතුටු කරන දේවල් හරහා සල්ලි එන කවුළුව මේකයි. යෝජනාව කරන්න. නිර්මාණේ එළියට දාන්න. දැන්.',
  },
  Saturn: {
    en: 'Do not gamble, shortcut or force during this passage — build slowly and document everything. What you construct with discipline now becomes the foundation the next twenty years stand on.',
    si: 'මේ කාලේ සූදු නෑ, කෙටි පාරවල් නෑ, බලෙන් කරන දේවල් නෑ. හෙමින් හදන්න, හැම දේම ලියලා තියාගන්න. දැන් විනයෙන් හදන දේ — ඊළඟ අවුරුදු විස්සම හිටගන්නේ ඒක උඩ. ශනි ඉවසන අයට ගෙවනවා. හැමවෙලේම.',
  },
  Rahu: {
    en: 'The unconventional door is the right one now: foreign opportunities, technology, the path nobody in your family tried. Verify everything twice though — Rahu’s gifts arrive wrapped in fog.',
    si: 'අමුතු පාර තමයි දැන් හරි පාර: පිටරට අවස්ථා, තාක්ෂණය, ඔබේ පවුලේ කවුරුත් ගිහින් නැති පැත්ත. ඒත් එක දෙයක් — හැම දේම දෙපාරක් බලන්න. රාහුගේ තෑගි එන්නේ මීදුමෙන් ඔතලා. ඇතුළේ තියෙන්නේ මොකක්ද කියලා හොඳට බලලා අරගන්න.',
  },
  Ketu: {
    en: 'Release what clings — the stale job, the draining tie, the identity you outgrew. What Ketu removes in this window was blocking what is meant for you; meditation now pays double.',
    si: 'අල්ලගෙන ඉන්න දේවල් අතාරින්න — එපා වෙච්ච රස්සාව, හිත කන බැඳීම, ඔබට දැන් පොඩි වෙච්ච අනන්‍යතාවය. මේ කාලේ කේතු අයින් කරන දේවල් ඔබට එන්න තිබුණු දේවල් නවත්තගෙන හිටිය ඒවා. භාවනාව දැන් දෙගුණයක් වැඩ කරනවා — ඇත්තටම.',
  },
};

// ═══════════════════════════════════════════════════════════════════════
//  CURRENT DASHA READS — 9 lords × 2 languages
// ═══════════════════════════════════════════════════════════════════════

const DASHA_READS = {
  Sun: {
    en: { name: 'Sun', text: 'You are living through your Sun period — a chapter of visibility, authority and reckoning with your own ambition. Doors open through leadership now; hiding your light is the only real mistake available to you.' },
    si: { name: 'රවි', text: 'ඔබ දැන් ගෙවන්නේ රවි මහ දශාව — පෙනෙන්න ඉන්න, නායකකම ගන්න කාලයක්. දැන් දොරවල් ඇරෙන්නේ ඉස්සරහට එන අයට. මේ කාලේ කරන්න පුළුවන් එකම වැරැද්ද මොකක්ද දන්නවද? ඔබේ එළිය හංගන එක.' },
  },
  Moon: {
    en: { name: 'Moon', text: 'You are living through your Moon period — a chapter where emotions, home and the people closest to you shape everything. Your intuition is at a lifetime peak right now; decisions made from inner quiet will outperform any strategy.' },
    si: { name: 'චන්ද්‍ර', text: 'ඔබ දැන් ගෙවන්නේ චන්ද්‍ර මහ දශාව — හිත, ගෙදර, ළඟම මිනිස්සු හැම දේම තීරණය කරන කාලයක්. ඔබේ ඇතුළේ දැනීම දැන් ජීවිතේ උපරිමේ. නිශ්ශබ්දව හිතලා ගන්න තීරණ — ඕනම සැලසුමකට වඩා හරියනවා.' },
  },
  Mars: {
    en: { name: 'Mars', text: 'You are living through your Mars period — a chapter of raw drive, property, courage and confrontation. Energy this strong builds empires or burns bridges; the difference is entirely in where you aim it.' },
    si: { name: 'කුජ', text: 'ඔබ දැන් ගෙවන්නේ කුජ මහ දශාව — අමු ශක්තියේ, ධෛර්යයේ, ඉඩකඩම්වල කාලයක්. මෙච්චර ශක්තියක් අධිරාජ්‍ය හදනවා — නැත්නම් පාලම් පුච්චනවා. වෙනස තියෙන්නේ එක තැනක විතරයි: ඔබ ඒක අල්ලන තැන.' },
  },
  Mercury: {
    en: { name: 'Mercury', text: 'You are living through your Mercury period — a chapter of commerce, contracts, learning and connection. Your words carry unusual weight in these years: deals, ideas and networks started now compound for decades.' },
    si: { name: 'බුධ', text: 'ඔබ දැන් ගෙවන්නේ බුධ මහ දශාව — වෙළඳාමේ, ගිවිසුම්වල, ඉගෙනීමේ කාලයක්. මේ අවුරුදුවල ඔබේ වචනවල අමුතු බරක් තියෙනවා. දැන් පටන් ගන්න ගනුදෙනු, අදහස්, සම්බන්ධකම් — දශක ගාණක් වැඩෙනවා.' },
  },
  Jupiter: {
    en: { name: 'Jupiter', text: 'You are living through your Jupiter period — classically the most fortunate chapter of a human life. Expansion, wisdom, wealth and blessings flow toward whoever holds this dasha; the question is only whether you are positioned to receive them.' },
    si: { name: 'ගුරු', text: 'ඔබ දැන් ගෙවන්නේ ගුරු මහ දශාව. පරණ පොත් කියන විදිහට — මිනිස් ජීවිතේකට එන වාසනාවන්තම කාලය මේක. ව්‍යාප්තිය, ප්‍රඥාව, ධනය, ආශීර්වාද — ඔක්කොම මේ දශාව ගෙවන කෙනා ළඟට එනවා. ප්‍රශ්නය එකයි: ඒවා ගන්න ඔබ ලෑස්තිද?' },
  },
  Venus: {
    en: { name: 'Venus', text: 'You are living through your Venus period — the longest and sweetest dasha of them all. Love, comfort, beauty and material pleasure define these years; what you devote yourself to now becomes the luxury of your future.' },
    si: { name: 'ශුක්‍ර', text: 'ඔබ දැන් ගෙවන්නේ ශුක්‍ර මහ දශාව — දශා ඔක්කොමගෙන් දිගම, මිහිරිම එක. ආදරේ, සැප, ලස්සන — මේ අවුරුදු හැදෙන්නේ ඒවායින්. දැන් ඔබ කැප වෙන දේ — ඒක තමයි ඔබේ අනාගතේ සැපට හැරෙන්නේ.' },
  },
  Saturn: {
    en: { name: 'Saturn', text: 'You are living through your Saturn period — the great teacher’s chapter. These years strip away everything false and reward only what is real: discipline, patience, earned mastery. Those who endure Saturn’s test emerge unbreakable.' },
    si: { name: 'ශනි', text: 'ඔබ දැන් ගෙවන්නේ ශනි මහ දශාව — ලොකුම ගුරුවරයාගේ කාලය. මේ අවුරුදු බොරු ඔක්කොම ගලවලා දානවා — ඉතුරු වෙන්නේ ඇත්ත විතරයි. විනය, ඉවසීම, උපයාගත්තු දක්ෂකම. ශනිගේ පරීක්ෂණය පාස් වෙච්ච කෙනෙක්ව ආයෙත් කවදාවත් කඩන්න බෑ.' },
  },
  Rahu: {
    en: { name: 'Rahu', text: 'You are living through your Rahu period — the chapter of hunger, ambition and the unconventional path. Rahu grants what you crave through unexpected doors: foreign connections, technology, sudden rises. The pace is dizzying by design.' },
    si: { name: 'රාහු', text: 'ඔබ දැන් ගෙවන්නේ රාහු මහ දශාව — ආසාවේ, අභිලාෂයේ, අමුතු පාරවල් වල කාලය. රාහු ඔබට ඕන දේ දෙනවා — ඒත් හිතුවේ නැති දොරවල් වලින්: පිටරට සම්බන්ධකම්, තාක්ෂණය, එකපාරට එන නැගීම්. ඔළුව කැරකෙන වේගය — ඒකත් රාහුගේම සැලසුම.' },
  },
  Ketu: {
    en: { name: 'Ketu', text: 'You are living through your Ketu period — the chapter of release and inner sight. Ketu removes what no longer serves your soul’s direction, sometimes abruptly — and replaces it with a clarity most people never taste in a whole lifetime.' },
    si: { name: 'කේතු', text: 'ඔබ දැන් ගෙවන්නේ කේතු මහ දශාව — අතහැරීමේ සහ ඇතුළත ඇස ඇරෙන කාලය. ඔබේ ගමනට වැඩක් නැති දේවල් කේතු අයින් කරනවා — සමහර වෙලාවට එකපාරටම. ඒත් ඒ වෙනුවට දෙන්නේ මොකක්ද දන්නවද? ගොඩක් මිනිස්සු මුළු ජීවිතේකදීවත් නොලබන පැහැදිලිකමක්.' },
  },
};

// ═══════════════════════════════════════════════════════════════════════
//  FUTURE CARD DOMAINS — what each dasha lord's window means, per domain
// ═══════════════════════════════════════════════════════════════════════

const DOMAIN_CARDS = {
  Jupiter: {
    id: 'fortune', icon: 'trending-up-outline', color: '#FFB800',
    en: { domain: 'Wealth & Expansion', title: 'Your Jupiter window', tease: 'The single luckiest stretch of your current chapter — wealth, growth and blessings peak here.' },
    si: { domain: 'ධනය සහ දියුණුව', title: 'ඔබේ ගුරු කවුළුව', tease: 'මේ පරිච්ඡේදයේ එන වාසනාවන්තම කාලය — ධනය, දියුණුව, ආශීර්වාද උපරිමයට එන්නේ මෙතනදී.' },
  },
  Venus: {
    id: 'love', icon: 'heart-outline', color: '#FF6B9D',
    en: { domain: 'Love & Marriage', title: 'Your Venus window', tease: 'Relationships, marriage prospects and pleasure enter their strongest phase of this era.' },
    si: { domain: 'ආදරය සහ විවාහය', title: 'ඔබේ ශුක්‍ර කවුළුව', tease: 'ආදර සම්බන්ධකම්, විවාහ කතා, ජීවිතේ රස — ඔක්කොම මේ යුගයේ ශක්තිමත්ම තැනට එනවා.' },
  },
  Mercury: {
    id: 'business', icon: 'briefcase-outline', color: '#06B6D4',
    en: { domain: 'Business & Contracts', title: 'Your Mercury window', tease: 'Deals, new income streams and negotiations are favoured — the merchant planet takes your side.' },
    si: { domain: 'ව්‍යාපාර සහ ගිවිසුම්', title: 'ඔබේ බුධ කවුළුව', tease: 'ගනුදෙනු, අලුත් ආදායම්, සාකච්ඡා — වෙළඳ ග්‍රහයා ඔබේ පැත්තට එන කාලය.' },
  },
  Sun: {
    id: 'career', icon: 'sunny-outline', color: '#FF8C00',
    en: { domain: 'Career & Recognition', title: 'Your Sun window', tease: 'Authority, promotion and public recognition concentrate in this period of your timeline.' },
    si: { domain: 'රැකියාව සහ පිළිගැනීම', title: 'ඔබේ රවි කවුළුව', tease: 'තනතුරු, උසස්වීම්, පිළිගැනීම — ඔක්කොම ඔබේ කාලරේඛාවේ මේ තැනට කේන්ද්‍ර වෙනවා.' },
  },
  Moon: {
    id: 'peace', icon: 'moon-outline', color: '#A78BFA',
    en: { domain: 'Mind & Home', title: 'Your Moon window', tease: 'Emotional turning points, home matters and inner peace dominate this stretch.' },
    si: { domain: 'හිත සහ ගෙදර', title: 'ඔබේ චන්ද්‍ර කවුළුව', tease: 'හිතේ හැරවුම්, ගෙදර කතා, ඇතුළත සාමය — මේ කාලය පාලනය කරන්නේ ඒවා.' },
  },
  Mars: {
    id: 'energy', icon: 'flame-outline', color: '#EF4444',
    en: { domain: 'Property & Courage', title: 'Your Mars window', tease: 'Land, property moves and bold action are charged in this period — timing matters enormously.' },
    si: { domain: 'දේපළ සහ ධෛර්යය', title: 'ඔබේ කුජ කවුළුව', tease: 'ඉඩම්, දේපළ, නිර්භීත පියවර — මේ කාලේ ඒවාට බලය තියෙනවා. වෙලාව හරියටම දැනගෙන කරන එකයි වැදගත්ම.' },
  },
  Saturn: {
    id: 'karma', icon: 'hourglass-outline', color: '#94A3B8',
    en: { domain: 'Karma & Discipline', title: 'Your Saturn passage', tease: 'A testing passage that must be navigated carefully — knowing its exact dates changes everything.' },
    si: { domain: 'කර්මය සහ විනය', title: 'ඔබේ ශනි ගමන', tease: 'පරිස්සමෙන් යන්න ඕන පරීක්ෂණ කාලයක් — ඒකේ නියම දින දැනගෙන ඉන්න එක හැම දේම වෙනස් කරනවා.' },
  },
  Rahu: {
    id: 'rise', icon: 'rocket-outline', color: '#9333EA',
    en: { domain: 'Sudden Rise & Foreign Luck', title: 'Your Rahu window', tease: 'Unexpected opportunities, foreign connections and rapid rises cluster in this window.' },
    si: { domain: 'හදිසි නැගීම සහ පිටරට වාසනාව', title: 'ඔබේ රාහු කවුළුව', tease: 'හිතුවේ නැති අවස්ථා, පිටරට සම්බන්ධකම්, එකපාර එන නැගීම් — ඔක්කොම කැටිවෙන්නේ මේ කවුළුවට.' },
  },
  Ketu: {
    id: 'insight', icon: 'eye-outline', color: '#34D399',
    en: { domain: 'Release & Inner Sight', title: 'Your Ketu passage', tease: 'A spiritual pivot point — what leaves your life here makes room for what was always meant.' },
    si: { domain: 'අතහැරීම සහ ඇතුළත ඇස', title: 'ඔබේ කේතු ගමන', tease: 'ආධ්‍යාත්මික හැරවුමක් — මෙතනදී ජීවිතෙන් යන දේ, ඔබට කලින්ම නියම වෙලා තිබුණු දේට ඉඩ හදනවා.' },
  },
};

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SI = ['ජනවාරි', 'පෙබරවාරි', 'මාර්තු', 'අප්‍රේල්', 'මැයි', 'ජූනි', 'ජූලි', 'අගෝස්තු', 'සැප්තැම්බර්', 'ඔක්තෝබර්', 'නොවැම්බර්', 'දෙසැම්බර්'];

function formatMonthYear(isoDate, lang) {
  const d = new Date(isoDate + 'T00:00:00Z');
  const months = lang === 'si' ? MONTHS_SI : MONTHS_EN;
  return months[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
}

/**
 * Walk the Vimshottari timeline and pick the current dasha context plus
 * the next few antardasha windows (real dates) for future cards.
 */
function extractDashaContext(periods, now) {
  const nowMs = now.getTime();
  let current = null;
  const upcoming = [];

  for (const md of periods) {
    for (const ad of md.antardashas) {
      const start = new Date(ad.start + 'T00:00:00Z').getTime();
      const end = new Date(ad.endDate + 'T00:00:00Z').getTime();
      if (start <= nowMs && nowMs < end) {
        current = { mahaLord: md.lord, adLord: ad.lord, adStart: ad.start, adEnd: ad.endDate, mahaStart: md.start, mahaEnd: md.endDate };
      } else if (start > nowMs && upcoming.length < 8) {
        upcoming.push({ mahaLord: md.lord, adLord: ad.lord, start: ad.start, end: ad.endDate });
      }
    }
    if (upcoming.length >= 8 && current) break;
  }
  return { current, upcoming };
}

/**
 * Build the future cards: the current window (FREE, with guidance) +
 * next distinct-domain antardasha windows (locked, real dates visible).
 */
function buildFutureCards(dashaCtx, lang) {
  const cards = [];
  const usedDomains = new Set();

  const pushCard = function (lord, startIso, isCurrent) {
    const domain = DOMAIN_CARDS[lord];
    if (!domain || usedDomains.has(domain.id)) return;
    usedDomains.add(domain.id);
    const loc = domain[lang] || domain.en;
    const when = formatMonthYear(startIso, lang);
    const guidance = (DASHA_GUIDANCE[lord] || DASHA_GUIDANCE.Sun)[lang];
    cards.push({
      id: domain.id,
      icon: domain.icon,
      color: domain.color,
      domain: loc.domain,
      title: loc.title,
      window: isCurrent
        ? (lang === 'si' ? 'දැන් විවෘතයි — ' + when + ' වෙනකම්' : 'Open now — until ' + when)
        : (lang === 'si' ? when + ' සිට විවෘත වෙනවා' : 'Opens ' + when),
      tease: loc.tease,
      // the currently-open window is given FREE, guidance included —
      // proof of real value; future windows stay locked
      locked: !isCurrent,
      guidance: isCurrent ? guidance : null,
    });
  };

  if (dashaCtx.current) {
    pushCard(dashaCtx.current.adLord, dashaCtx.current.adEnd, true);
  }
  for (const win of dashaCtx.upcoming) {
    if (cards.length >= 4) break;
    pushCard(win.adLord, win.start, false);
  }

  // Timelines that run past the standard 120-year Vimshottari cycle (or
  // otherwise yield no windows) must never render an EMPTY future page —
  // keep one locked card so the cliffhanger chapter still has substance.
  if (cards.length === 0) {
    cards.push({
      id: 'timeline',
      icon: 'telescope-outline',
      color: '#A78BFA',
      domain: lang === 'si' ? 'ඔබේ කාලරේඛාව' : 'Your Timeline',
      title: lang === 'si' ? 'ගැඹුරු කියවීමක් ඉල්ලන කේන්දරයක්' : 'A chart that asks for a closer reading',
      window: lang === 'si' ? 'සම්පූර්ණ කියවීමේදී' : 'In your full reading',
      tease: lang === 'si'
        ? 'ඔබේ කාලරේඛාව සාමාන්‍ය දශා චක්‍රයෙන් එහාට ගිහින්. මේ වගේ කේන්දර කියවෙන්නේ සම්පූර්ණ විශ්ලේෂණයකින්.'
        : 'Your timeline runs beyond the standard dasha cycle. Charts like this are read through the full analysis.',
      locked: true,
      guidance: null,
    });
  }
  return cards;
}

/**
 * Compose the full reveal payload.
 */
function composeReveal(p) {
  const lang = p.language === 'si' ? 'si' : 'en';
  const lagnaName = p.lagna.rashi.name;
  const lagnaRead = (LAGNA_READS[lagnaName] || LAGNA_READS.Mesha)[lang];
  const nakRead = (NAKSHATRA_READS[p.nakshatra.name] || NAKSHATRA_READS.Ashwini)[lang];

  const dashaCtx = extractDashaContext(p.dashaPeriods, p.now || new Date());
  const mahaLord = dashaCtx.current ? dashaCtx.current.mahaLord : p.dashaPeriods[0].lord;
  const dashaRead = (DASHA_READS[mahaLord] || DASHA_READS.Sun)[lang];
  const mahaSinceYear = dashaCtx.current ? dashaCtx.current.mahaStart.slice(0, 4) : null;
  const mahaUntil = dashaCtx.current ? formatMonthYear(dashaCtx.current.mahaEnd, lang) : null;

  const greeting = (function () {
    const namePart = p.name ? p.name + ', ' : '';
    if (lang === 'si') {
      return namePart + 'ඔබ ඉපදුණු මොහොතේ අහස කියවලා ඉවරයි. මේක වෙන කාටවත් අයිති නෑ — මේක ඔබේමයි.';
    }
    return namePart + 'the sky of your birth moment has been read. What follows belongs to no one else — it is yours alone.';
  })();

  return {
    greeting,
    lagna: {
      name: lagnaName,
      english: p.lagna.rashi.english,
      sinhala: p.lagna.rashi.sinhala,
      rashiId: p.lagna.rashi.id,
      degree: Math.round((p.lagna.sidereal % 30) * 10) / 10,
    },
    nakshatra: {
      name: p.nakshatra.name,
      sinhala: p.nakshatra.sinhala,
      pada: p.nakshatra.pada,
    },
    moonRashi: {
      name: p.moonRashi.name,
      english: p.moonRashi.english,
      sinhala: p.moonRashi.sinhala,
    },
    dasha: {
      lord: mahaLord,
      lordLabel: (DASHA_READS[mahaLord] || DASHA_READS.Sun)[lang].name,
      sinceYear: mahaSinceYear,
      until: mahaUntil,
    },
    identity: [
      { kind: 'lagna', title: lagnaRead.title, text: lagnaRead.text },
      { kind: 'nakshatra', title: nakRead.title, text: nakRead.text },
      { kind: 'moon', title: lang === 'si' ? 'ඔබේ ඇතුළත ලෝකය' : 'Your inner world', text: (MOON_READS[p.moonRashi.name] || MOON_READS.Mesha)[lang] },
      { kind: 'dasha', title: lang === 'si' ? 'ඔබ දැන් ගෙවන කාලය' : 'The chapter you are living now', text: dashaRead.text },
    ],
    futureCards: buildFutureCards(dashaCtx, lang),
  };
}

module.exports = { composeReveal, LAGNA_READS, NAKSHATRA_READS, MOON_READS, DASHA_READS, DASHA_GUIDANCE, DOMAIN_CARDS };
