/**
 * Shared prompt style blocks for every Gemini-powered generator in the studio.
 * The Sinhala voice is ported from server/src/engine/sinhalaVoice.js — the
 * single source of truth for how our Sinhala sounds.
 */

export const SINHALA_VOICE = `━━━ සිංහල හඬ — දැඩිව අනුගමනය කරන්න ━━━
ලියන්නේ ඥානවන්ත, උණුසුම් කෙනෙක් ඉදිරියේ ඉඳන් කෙලින්ම කතා කරනවා වගේ — පොතක බස නෙවෙයි, හදවතින් කියන බස.
• "ඔබ / ඔබේ" පමණයි (කිසිදා "ඔයා" නැත; දුරස්ථ "ඔබගේ" වළක්වන්න). කෙටි, ස්වාභාවික වාක්‍ය.
• ජීවමාන ක්‍රියාපද — එනවා, හැදෙනවා, ලැබෙනවා, වැඩෙනවා. ⚠️ "වනු ඇත / සිදු වේ / පවතී / ලැබේ / හැකියාව ඇත" වැනි ලේඛන බස සම්පූර්ණයෙන් තහනම්.
• ඉංග්‍රීසි වාක්‍ය ව්‍යුහය සිංහලට හරවන්න එපා — මුලින්ම සිංහලෙන් හිතන්න.
රොබෝ බස → මිනිස් බස:
❌ "ධන වර්ධනයක් සිදු වනු ඇත" → ✅ "මුදල් අතින් හොඳ වාසනාවක් තියෙනවා"
❌ "අවබෝධතාවයක් ඇති වනු ඇත" → ✅ "හොඳ අවබෝධයක් හැදෙනවා"
❌ "සාර්ථකත්වයක් ලබා ගැනීමට හැකියාව පවතී" → ✅ "ලොකු දියුණුවක් එන කාලයක් ළඟයි"
රිද්මයට විරල ද්විත්ව යෙදුම්: "ලාභ පිට ලාභ", "සිතු සිතු දේ", "අත ගහන ගහන වැඩේ".`;

/** Viral Sri Lankan astro-Facebook furniture (from the big lagna-palapala pages). */
export const SINHALA_FB_STYLE = `SINHALA VIRAL POST FORMULA (big lagna-palapala FB pages):
- Curiosity headline that names a COUNT, never the signs: "ලග්න 5කට අදම විශේෂ ලැබීම්!" / "මේ ලග්න 3ට සල්ලි වැස්සක්!"
- Cite the transit as authority: "චන්ද්‍රයා කටකයට යද්දී..." — one short clause, no jargon beyond planet+sign.
- Emoji as section bullets only (🌟 💰 ❤️ ⚠️), 3-5 per post, never mid-sentence spam.
- Comment bait line: "ඔබේ ලග්නය මොකක්ද? පහළින් කියන්න 👇"
- Share nudge: "යාළුවෙක්ටත් බලන්න share කරන්න."
- Blessing close: "සුබ දවසක් වේවා 🙏"`;

/**
 * The viral English astrology READING register — modelled on the 6M-follower
 * "Moon Omens" school: intimate present-tense readings, not forecast bulletins.
 */
export const ENGLISH_READING_VOICE = `ENGLISH READING VOICE (the viral Moon-Omens register):
- Second person, present tense — an intimate reading spoken to one person: "The Moon crosses your work house — and it asks you to slow the pace. What you build gently now holds."
- Sentence music: medium lines broken by em-dashes; ONE short poetic fragment is welcome ("A return to softness.").
- Open from the real fact (transit, day, count), then turn it inward: [fact] — and it invites you to [inner shift + one concrete act].
- Themes that carry: coming home to yourself, softening, receiving, release, quiet strength, being seen at last.
- Close with one gentle imperative ("let it", "say yes to the small one", "rest there").
- BANNED filler (instant rewrite): energy, universe, journey, embrace, align, cosmic, vibration, manifest, unlock, elevate, divine timing.
- No emojis, no exclamation marks, no jargon beyond planet + house/sign.
Calibre required:
"The Moon moves through your money house before Friday — a payment or an offer finds you. Say yes to the small one; it grows."
"Four bright days this week, and Sunday is the doorway — bring what you have been carrying, and set it down there."`;

/** Sinhala rashi names — Sinhala lines must never carry the English sign name. */
export const SIGN_SI: Record<string, string> = {
  Aries: 'මේෂ', Taurus: 'වෘෂභ', Gemini: 'මිථුන', Cancer: 'කටක',
  Leo: 'සිංහ', Virgo: 'කන්‍යා', Libra: 'තුලා', Scorpio: 'වෘශ්චික',
  Sagittarius: 'ධනු', Capricorn: 'මකර', Aquarius: 'කුම්භ', Pisces: 'මීන',
};
