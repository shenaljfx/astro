/* ═══════════════════════════════════════════════════════════════════════
   Grahachara — Internationalization (i18n) Engine
   Full Sinhala (සිංහල) + English support
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Translation dictionaries ───────────────────────────────────── */
  var translations = {

    en: {
      /* Nav */
      "nav.features":       "Features",
      "nav.howItWorks":     "How It Works",
      "nav.screenshots":    "Screenshots",
      "nav.pricing":        "Pricing",
      "nav.reviews":        "Reviews",
      "nav.faq":            "FAQ",
      "nav.download":       "Download Now",
      "nav.downloadMobile": "Download Now",

      /* Hero */
      "hero.badge":         "Sri Lanka's #1 Astrology App",
      "hero.titleLine1":    "Your Stars,",
      "hero.titleAccent":   "Your Grahachara",
      "hero.subtitle":      'Ancient Vedic wisdom meets modern technology. Get real-time Rahu Kalaya alerts, personalized birth chart reports, marriage compatibility scores, and chat with your personal astrologer — all in <strong>Sinhala</strong> &amp; <strong>English</strong>.',
      "hero.btnDownload":   "Download Now",
      "hero.btnExplore":    "Explore Features",
      "hero.scroll":        "Scroll to explore",

      /* Trust strip */
      "trust.madeIn":       "🇱🇰 Made in Sri Lanka",
      "trust.privacy":      "🛡️ Privacy First — No data sold",
      "trust.ayanamsha":    "🔮 Lahiri Ayanamsha (Traditional)",
      "trust.nakshatras":   "📿 27 Nakshatras · 12 Rashis · 9 Grahas",
      "trust.price":        "💰 Just LKR 8/day — All features",

      /* Features section */
      "features.label":     "Features",
      "features.title":     "Everything the Stars Reveal",
      "features.desc":      "Six powerful tools in one beautifully crafted app — from daily auspicious times to deep life analysis.",

      "feat1.title":        "Rahu Kalaya & Daily Nakath",
      "feat1.desc":         "Real-time Rahu Kalaya tracking with push notifications. Full Panchanga — Tithi, Nakshatra, Yoga, Karana — updated for your exact GPS location.",
      "feat1.tag1":         "GPS-based",
      "feat1.tag2":         "Push alerts",
      "feat1.tag3":         "Panchanga",

      "feat2.title":        "Porondam — Marriage Match",
      "feat2.desc":         "Traditional 20-point compatibility engine. Check Dina, Gana, Yoni, Rashi, Vasya, Nadi & Mahendra kūta with detailed interpretation.",
      "feat2.tag1":         "7 Factors",
      "feat2.tag2":         "20 Points",
      "feat2.tag3":         "Dosha Check",

      "feat3.title":        "Grahachara Chat",
      "feat3.desc":         "Ask anything — career, love, health, lucky times. Grahachara reads your birth chart and current transits to give deeply personal answers.",
      "feat3.tag1":         "Personal",
      "feat3.tag2":         "Birth-chart aware",
      "feat3.tag3":         "Dream reader",

      "feat4.title":        "Complete Life Report",
      "feat4.desc":         "22-section detailed narrative covering personality, career, marriage, children, health, finances, past life, spiritual path & 25-year timeline.",
      "feat4.tag1":         "22 Sections",
      "feat4.tag2":         "LKR 350",
      "feat4.tag3":         "PDF Export",

      "feat5.title":        "Kendara — Birth Chart",
      "feat5.desc":         "Traditional Sri Lankan Kendara chart with all 9 Grahas, Lagna, Navamsha D9, KP sub-lords, Dasha timeline & Maraka Apala engine.",
      "feat5.tag1":         "Rashi + Navamsha",
      "feat5.tag2":         "KP System",
      "feat5.tag3":         "Dasha",

      "feat6.title":        "Sinhala & English",
      "feat6.desc":         "Full Sinhala (සිංහල) and English support. Every screen, every report, every response — in your preferred language.",
      "feat6.tag1":         "සිංහල",
      "feat6.tag2":         "English",

      /* How it works */
      "how.label":          "How It Works",
      "how.title":          "3 Steps to Cosmic Clarity",

      "how.step1.title":    "Enter Your Birth Details",
      "how.step1.desc":     "Date, time, and place of birth. We use the Lahiri Ayanamsha — the traditional standard across Sri Lanka — to calculate your sidereal chart with sub-arcminute accuracy.",
      "how.step2.title":    "Grahachara Reads Your Stars",
      "how.step2.desc":     "Our engine computes planetary positions, house placements, Yogas, Doshas, and Dasha periods — then weaves this data into deeply personal, human-readable insights you can actually understand.",
      "how.step3.title":    "Live Daily Guidance",
      "how.step3.desc":     "Get real-time Rahu Kalaya alerts, daily Nakath, transit updates, and chat with your personal astrologer anytime — like having a Gurunnanse in your pocket.",

      /* Screenshots */
      "screenshots.label":  "Screenshots",
      "screenshots.title":  "A Glimpse Inside",
      "screenshots.desc":   "Dark cosmic design that feels alive. Every pixel crafted for the Sri Lankan user.",
      "scr.home":           "Home — Daily Nakath",
      "scr.chat":           "Grahachara Chat",
      "scr.kendara1":       "Kendara — Birth Chart",
      "scr.kendara2":       "Kendara — Planets",
      "scr.kendara3":       "Kendara — Navamsha",
      "scr.kendara4":       "Kendara — Dasha",
      "scr.report":         "Life Report",
      "scr.porondam":       "Porondam Matching",
      "scr.swipe":          "← Swipe to explore →",

      /* Pricing */
      "pricing.label":      "Pricing",
      "pricing.title":      "Simple. Affordable. Sri Lankan.",
      "pricing.desc":       "Everything for just Rs. 8 a day — less than a cup of tea. No hidden fees, cancel anytime.",

      "price1.badge":       "⭐ All Features",
      "price1.amount":      "LKR 8",
      "price1.period":      "/ day",
      "price1.savings":     "That's just Rs. 240/month — less than a cup of tea ☕",
      "price1.f1":          "Daily Rahu Kalaya & Nakath",
      "price1.f2":          "Full Panchanga",
      "price1.f3":          "Birth Chart (Kendara)",
      "price1.f4":          "<strong>10 chat questions per day</strong>",
      "price1.f5":          "Push notifications",
      "price1.f6":          "Dream interpretation",
      "price1.f7":          "Advanced transit alerts",
      "price1.f8":          "No ads, ever",
      "price1.f9":          "Cancel anytime — no lock-in",
      "price1.cta":         "Get Started — LKR 8/day",

      "price2.badge":       "Life Report",
      "price2.amount":      "LKR 350",
      "price2.period":      "per report",
      "price2.f1":          "<strong>22-section Life Report</strong>",
      "price2.f2":          "Personality, Career, Marriage",
      "price2.f3":          "25-Year Life Timeline",
      "price2.f4":          "Health Blueprint",
      "price2.f5":          "Past Life & Spiritual Journey",
      "price2.f6":          "PDF Export & Share",
      "price2.f7":          "Permanent access",
      "price2.cta":         "Generate Report",

      "price3.badge":       "Porondam",
      "price3.amount":      "LKR 50",
      "price3.period":      "per report",
      "price3.f1":          "7-Factor Kūta Analysis",
      "price3.f2":          "20-Point Compatibility Score",
      "price3.f3":          "Dosha Detection",
      "price3.f4":          "Detailed Interpretation",
      "price3.f5":          'WhatsApp "Vibe Check" Link',
      "price3.f6":          "Remedies & Suggestions",
      "price3.f7":          "Shareable Results",
      "price3.cta":         "Check Match",

      /* Testimonials */
      "testimonials.label": "Reviews",
      "testimonials.title": "Loved Across Sri Lanka",

      "review1.text":       '"Porondam score was exactly what our family astrologer said — 18/20! The explanation was even more detailed. Amazing app. 🙏"',
      "review1.name":       "Nimesha",
      "review1.loc":        "Kandy",

      "review2.text":       '"I check Rahu Kalaya every morning before leaving home. The Sinhala interface is perfect — finally an astrology app that actually feels Sri Lankan!"',
      "review2.name":       "Sandun",
      "review2.loc":        "Colombo",

      "review3.text":       '"The life report blew my mind. It knew things about my career path that I never told anyone. Worth every rupee — better than visiting an astrologer in person."',
      "review3.name":       "Kavindi",
      "review3.loc":        "Galle",

      /* FAQ */
      "faq.label":          "FAQ",
      "faq.title":          "Frequently Asked Questions",

      "faq1.q":             "How much does it cost?",
      "faq1.a":             "Grahachara gives you access to all features — Rahu Kalaya, Nakath, Panchanga, birth charts, 10 daily chat questions, push notifications, dream interpretation and more — for just LKR 8/day (about Rs. 240/month). Premium add-ons like the full Life Report (LKR 350) and Porondam matching (LKR 50) are one-time pay-per-use. No hidden fees, cancel anytime.",

      "faq2.q":             "Which Ayanamsha does it use?",
      "faq2.a":             "We use the Lahiri Ayanamsha — the traditional standard used across Sri Lanka and India. All calculations are sidereal (not tropical/Western), matching what your family astrologer uses.",

      "faq3.q":             "How accurate are the calculations?",
      "faq3.a":             "Our engine uses the Meeus astronomical algorithms and ephemeris data for planetary positions. We verified Lagna accuracy against multiple known birth charts with exact matches. The Panchanga is calculated for your exact GPS coordinates.",

      "faq4.q":             "Is my data private?",
      "faq4.a":             "Absolutely. Your birth data is stored securely and never sold or shared. We don't run ads or sell user profiles. Your cosmic data stays between you and the stars. 🌟",

      "faq5.q":             "What languages are supported?",
      "faq5.a":             "The entire app — every screen, button, and response — is available in සිංහල (Sinhala) and English. You choose your language during onboarding and can switch anytime from settings.",

      "faq6.q":             "How does the Grahachara astrologer chat work?",
      "faq6.a":             "When you ask a question, Grahachara reads your birth chart (planet positions, house placements, current Dasha period) and combines it with real-time planetary transits to generate a deeply personal, context-aware response — not generic horoscopes.",

      /* Download CTA */
      "download.title":     "Ready to Read Your Stars?",
      "download.desc":      "Download Grahachara now. Enter your birth details. Let the cosmos guide you.",
      "download.appstore":  "App Store",
      "download.appstoreSub": "Download on the",
      "download.playstore": "Google Play",
      "download.playstoreSub": "Get it on",

      /* Footer */
      "footer.taglineSi":   "ග්‍රහචාර — ඔබේ පුද්ගලික ජ්‍යෝතිෂවේදියා",
      "footer.tagline":     'Ancient Vedic wisdom, modern technology.<br>Made with ❤️ in Sri Lanka 🇱🇰',
      "footer.product":     "Product",
      "footer.resources":   "Resources",
      "footer.legal":       "Legal",
      "footer.features":    "Features",
      "footer.pricing":     "Pricing",
      "footer.screenshots": "Screenshots",
      "footer.download":    "Download",
      "footer.apiDocs":     "API Docs",
      "footer.blog":        "Blog",
      "footer.changelog":   "Changelog",
      "footer.status":      "Status",
      "footer.privacy":     "Privacy Policy",
      "footer.terms":       "Terms of Service",
      "footer.cookies":     "Cookie Policy",
      "footer.contact":     "Contact",
      "footer.copyright":   "© 2026 Grahachara. All rights reserved."
    },

    /* ─────────────────────────────────────────────────────────────────
       සිංහල (Sinhala) translations
       ───────────────────────────────────────────────────────────────── */
    si: {
      /* Nav */
      "nav.features":       "විශේෂාංග",
      "nav.howItWorks":     "වැඩ කරන්නේ කොහොමද?",
      "nav.screenshots":    "Screenshots",
      "nav.pricing":        "මිල ගණන්",
      "nav.reviews":        "Reviews",
      "nav.faq":            "ප්‍රශ්න සහ පිළිතුරු",
      "nav.download":       "Download කරගන්න",
      "nav.downloadMobile": "Download කරගන්න",

      /* Hero */
      "hero.badge":         "ශ්‍රී ලංකාවේ #1 ජ්‍යෝතිෂ App එක",
      "hero.titleLine1":    "ඔයාගේ තරු,",
      "hero.titleAccent":   "ඔයාගේ ග්‍රහචාර",
      "hero.subtitle":      'පුරාණ වේද දැනුමයි අලුත්ම තාක්ෂණයයි එකට එකතු වුණු තැනක්. නිවැරදිම රාහු කාලය, ඔයාගේම උපන් වෙලාවට හදපු කේන්දරේ, පොරොන්දම් ගැලපීම්, සහ ඔයාගේම Personal ජ්‍යෝතිෂවේදියා එක්ක Chat කරන්න — මේ ඔක්කොම <strong>සිංහල</strong> සහ <strong>English</strong> වලින්.',
      "hero.btnDownload":   "Download කරගන්න",
      "hero.btnExplore":    "විශේෂාංග බලන්න",
      "hero.scroll":        "තව විස්තර බලන්න",

      /* Trust strip */
      "trust.madeIn":       "🇱🇰 ශ්‍රී ලංකාවේ ලාංකික නිපැයුමක්",
      "trust.privacy":      "🛡️ Privacy First — ඔයාගේ දත්ත කාටවත් විකුණන්නේ නෑ",
      "trust.ayanamsha":    "🔮 ලාහිරි අයනාංශ (සම්ප්‍රදායික)",
      "trust.nakshatras":   "📿 නක්ෂත්‍ර 27 · රාශි 12 · ග්‍රහ 9",
      "trust.price":        "💰 දවසට රු. 8යි — ඔක්කොම Features ලැබෙනවා",

      /* Features section */
      "features.label":     "විශේෂාංග",
      "features.title":     "ඔයාගේ තරු වලින් කියවෙන හැමදේම",
      "features.desc":      "සුභ මුහුර්ත වල ඉඳන් ජීවිතේ ගැඹුරුම තැන් ගැන විශ්ලේෂණය කරන්න පුළුවන් ප්‍රබල ටූල්ස් 6ක්. ලස්සනම App එකක් විදිහට.",

      "feat1.title":        "රාහු කාලය සහ දවසේ නැකත්",
      "feat1.desc":         "ඔයා ඉන්න තැනටම හරියන්න හදපු රාහු කාලය, notification එකකින්ම බලාගන්න. තිථි, නක්ෂත්‍ර, යෝග, කරණ — මේ ඔක්කොම හරියටම දැනගන්න.",
      "feat1.tag1":         "GPS මගින්",
      "feat1.tag2":         "Push Notifications",
      "feat1.tag3":         "පංචාංග",

      "feat2.title":        "පොරොන්දම් ගැලපීම",
      "feat2.desc":         "සම්ප්‍රදායික ලකුණු 20 ක්‍රමයට පොරොන්දම් ගලපන්න. දින, ගණ, යෝනි, රාශි, වශ්‍ය, නාඩි සහ මහේන්ද්‍ර වගේ හැම දෙයක්ම පැහැදිලිව සිංහලෙන් බලාගන්න.",
      "feat2.tag1":         "සාධක 7ක්",
      "feat2.tag2":         "ලකුණු 20න්",
      "feat2.tag3":         "දෝෂ පරීක්ෂාව",

      "feat3.title":        "ග්‍රහචාර Chat",
      "feat3.desc":         "රස්සාව, ආදරය, සෞඛ්‍යය, සුභ වෙලාවල් ගැන ඕනම දෙයක් අහන්න. ග්‍රහචාර AI එක ඔයාගේම කේන්දරේ බලලා, හරියටම ඔයාට ගැලපෙන උත්තරේ දෙනවා.",
      "feat3.tag1":         "Personal සහාය",
      "feat3.tag2":         "උපත් පත්‍රේ බලලමයි",
      "feat3.tag3":         "හීන පලාපල",

      "feat4.title":        "සම්පූර්ණ ජීවිත වාර්තාව",
      "feat4.desc":         "ඔයාගේ චරිතය, රස්සාව, විවාහය, දරුවෝ, සෞඛ්‍යය, සල්ලි, පෙර පින්, සහ ඉස්සරහට එන අවුරුදු 25 ගැන සම්පූර්ණ විස්තරයක්.",
      "feat4.tag1":         "මාතෘකා 22ක්",
      "feat4.tag2":         "රු. 350යි",
      "feat4.tag3":         "PDF එකක් විදිහට",

      "feat5.title":        "කේන්දරේ — උපත් පත්‍රය",
      "feat5.desc":         "අපේ සාම්ප්‍රදායික ක්‍රමයට හදපු කේන්දරය. ග්‍රහයෝ 9 දෙනා, ලග්නය, නවාංශකය, දශා කාල සහ මාරක අපල ගැන ඔක්කොම විස්තර.",
      "feat5.tag1":         "රාශි + නවාංශ",
      "feat5.tag2":         "KP ක්‍රමය",
      "feat5.tag3":         "දශා විස්තර",

      "feat6.title":        "සිංහල සහ English",
      "feat6.desc":         "App එකේ හැම තැනකම සිංහල සහ English භාෂා දෙකම තියෙනවා. ඔයාට ලේසි භාෂාවක් තෝරගන්න පුළුවන්.",
      "feat6.tag1":         "සිංහල",
      "feat6.tag2":         "English",

      /* How it works */
      "how.label":          "වැඩ කරන්නේ මෙහෙමයි",
      "how.title":          "පියවර 3කින් ඔක්කොම දැනගන්න",

      "how.step1.title":    "උපන් විස්තර දාන්න",
      "how.step1.desc":     "ඔයා ඉපදුණු දවස, වෙලාව සහ තැන දෙන්න. අපි පාවිච්චි කරන්නේ ලංකාවේ පිළිගත්ත 'ලාහිරි අයනාංශ' ක්‍රමය. ඒ නිසා කේන්දරේ ගොඩක්ම නිවැරදියි.",
      "how.step2.title":    "ග්‍රහචාර ඔයාගේ තරු කියවනවා",
      "how.step2.desc":     "අපේ System එකෙන් ඔයාගේ ග්‍රහ පිහිටීම්, යෝග, දෝෂ, දශා කාල ඔක්කොම ගණනය කරලා, කාට වුණත් තේරෙන සරල සිංහලෙන් විස්තරේ ලබා දෙනවා.",
      "how.step3.title":    "දිනපතා මඟ පෙන්වීම",
      "how.step3.desc":     "රාහු කාලය ගැන notification එකක් එනවා. දවසේ නැකත් බලන්න, ග්‍රහ මාරු ගැන දැනගන්න, ඕන වෙලාවක Personal Astrologer කෙනෙක් එක්ක Chat කරන්න පුළුවන්.",

      /* Screenshots */
      "screenshots.label":  "තිරපිටපත්",
      "screenshots.title":  "App එක ඇතුළේ...",
      "screenshots.desc":   "ලංකාවේ අපිටම ගැලපෙන්න, හරිම ලස්සනට සහ පිරිසිදුව හදපු Design එකක්.",
      "scr.home":           "Home — දවසේ නැකත්",
      "scr.chat":           "ග්‍රහචාර Chat",
      "scr.kendara1":       "කේන්දරය — රාශි",
      "scr.kendara2":       "කේන්දරය — ග්‍රහයන්",
      "scr.kendara3":       "කේන්දරය — නවාංශකය",
      "scr.kendara4":       "කේන්දරය — දශා",
      "scr.report":         "ජීවිත වාර්තාව",
      "scr.porondam":       "පොරොන්දම් ගැලපීම",
      "scr.swipe":          "← Swipe කරලා බලන්න →",

      /* Pricing */
      "pricing.label":      "මිල ගණන්",
      "pricing.title":      "සරලයි. ලාභයි. අපේ දෙයක්.",
      "pricing.desc":       "දවසට රු. 8යි යන්නේ. තේ එකක් බොනවටත් වඩා අඩුයිනේ. හංගපු ගණන් මුකුත් නෑ.",

      "price1.badge":       "⭐ හැම දේම හම්බෙනවා",
      "price1.amount":      "රු. 8",
      "price1.period":      "/ දවසට",
      "price1.savings":     "මාසෙටම රු. 240යි — තේ එකක ගාණවත් නෑනේ ☕",
      "price1.f1":          "දිනපතා රාහු කාලය සහ නැකත්",
      "price1.f2":          "සම්පූර්ණ පංචාංගය",
      "price1.f3":          "උපත් පත්‍රය (කේන්දරය)",
      "price1.f4":          "<strong>දවසට Chat ප්‍රශ්න 10යි (10 Questions Only)</strong>",
      "price1.f5":          "Push notifications එනවා",
      "price1.f6":          "හීන පලාපල දැනගන්න",
      "price1.f7":          "ග්‍රහ මාරු ගැන දැනුම්දීම්",
      "price1.f8":          "Ads එන්නේ නෑ (No Ads)",
      "price1.f9":          "කැමති දවසක නවත්තන්න පුළුවන් (Cancel anytime)",
      "price1.cta":         "පටන් ගන්න — දවසට රු. 8යි",

      "price2.badge":       "ජීවිත වාර්තාව",
      "price2.amount":      "රු. 350",
      "price2.period":      "වාර්තාවට",
      "price2.f1":          "<strong>මාතෘකා 22ක සම්පූර්ණ වාර්තාවක්</strong>",
      "price2.f2":          "චරිතය, රස්සාව, විවාහය ගැන ඔක්කොම",
      "price2.f3":          "අවුරුදු 25ක ජීවිත කාල රේඛාව (Timeline)",
      "price2.f4":          "සෞඛ්‍ය ගැන විස්තර",
      "price2.f5":          "පෙර පින් සහ ආධ්‍යාත්මික ගමන",
      "price2.f6":          "PDF එකක් විදිහට Download කරගන්න",
      "price2.f7":          "ජීවිත කාලෙම තියාගන්න පුළුවන්",
      "price2.cta":         "වාර්තාව ලබා ගන්න",

      "price3.badge":       "පොරොන්දම්",
      "price3.amount":      "රු. 50",
      "price3.period":      "වාර්තාවට",
      "price3.f1":          "සාධක 7ම බලනවා",
      "price3.f2":          "ලකුණු 20න් ගැලපීම බලනවා",
      "price3.f3":          "දෝෂ තියෙනවද කියලත් බලනවා",
      "price3.f4":          "පැහැදිලිව විස්තර කරලා දෙනවා",
      "price3.f5":          'WhatsApp යවන්න ලින්ක් එකක්',
      "price3.f6":          "පිළියම් සහ යෝජනා එක්කම",
      "price3.f7":          "යාලුවන්ටත් යවන්න පුළුවන්",
      "price3.cta":         "ගැලපීම පරීක්ෂා කරන්න",

      /* Testimonials */
      "testimonials.label": "අදහස්",
      "testimonials.title": "ලංකාව පුරාම අය කැමතියි",

      "review1.text":       '"අපේ පවුලේ ජොතිෂ්‍ය මහත්තයා කියපු විදිහටම පොරොන්දම් ගැලපුණා — 18/20! ඒකෙ විස්තරේ ඊටත් වඩා හොඳයි. මාරම App එකක්. 🙏"',
      "review1.name":       "නිමේෂා",
      "review1.loc":        "මහනුවර",

      "review2.text":       '"වැඩට යන්න කලින් මම හැමදාම රාහු කාලය බලනවා. සිංහලෙන් තියෙන නිසා හරිම ලේසියි. නියම ලාංකික App එකක්!"',
      "review2.name":       "සඳුන්",
      "review2.loc":        "කොළඹ",

      "review3.text":       '"ජීවිත වාර්තාව කියෙව්වම මට පුදුම හිතුනා. කවුරුත් නොදන්න මගේ දේවල් පවා ඒකෙ තිබුණා. වියදම් කරපු ගාණට වටිනවා විතරක් නෙමෙයි, ඊටත් වඩා වටිනවා."',
      "review3.name":       "කවින්දි",
      "review3.loc":        "ගාල්ල",

      /* FAQ */
      "faq.label":          "ප්‍රශ්න සහ පිළිතුරු",
      "faq.title":          "නිතර අහන ප්‍රශ්න",

      "faq1.q":             "ගාණ කීයද?",
      "faq1.a":             "ග්‍රහචාර වල තියෙන හැම පහසුකමක්ම — රාහු කාලය, නැකත්, පංචාංගය, කේන්දරය, දවසට Chat ප්‍රශ්න 10ක්, Push notifications, හීන පලාපල මේ ඔක්කොටම යන්නේ දවසට රු. 8යි (මාසෙටම රු. 240ක් වගේ). ජීවිත වාර්තාව (රු. 350) සහ පොරොන්දම් ගැලපීම (රු. 50) විතරක් වෙනම ගෙවලා ගන්න පුළුවන්. හංගපු ගාස්තු මුකුත් නෑ.",

      "faq2.q":             "මේක හදලා තියෙන්නේ මොන ක්‍රමයටද?",
      "faq2.a":             "අපි පාවිච්චි කරන්නේ 'ලාහිරි අයනාංශ' (Lahiri Ayanamsha) ක්‍රමය. මේක තමයි ලංකාවේ සහ ඉන්දියාවේ සම්ප්‍රදායිකව පිළිගන්න නිවැරදිම ක්‍රමය. ඒ නිසා පවුලේ ජ්‍යෝතිෂවේදියා බලන විදිහටමයි මේකත් වැඩ කරන්නේ.",

      "faq3.q":             "මේක කොච්චර නිවැරදිද?",
      "faq3.a":             "අපි ග්‍රහ පිහිටීම් ගන්න පාවිච්චි කරන්නේ නාසා (NASA) එකේ දත්ත වලට සමාන Meeus ඇල්ගොරිතම. අපි මේක ගොඩක් කේන්දර එක්ක සසඳලා බලලා තමයි හදලා තියෙන්නේ. පංචාංගය හදන්නෙත් ඔයා ඉන්න තැනේ GPS ඛණ්ඩාංක වලටම ගැලපෙන්නයි.",

      "faq4.q":             "මගේ පුද්ගලික තොරතුරු ආරක්ෂිතද?",
      "faq4.a":             "අනිවාර්යයෙන්ම. ඔයාගේ උපන් විස්තර අපි කාටවත් දෙන්නේ නෑ. අපි ඒවා කාටවත් විකුණන්නේවත්, Ads දාන්න පාවිච්චි කරන්නෙවත් නෑ. ඔයාගේ විස්තර ඔයාට විතරයි. 🌟",

      "faq5.q":             "මොන භාෂා වලින්ද වැඩ?",
      "faq5.a":             "App එකේ හැම තැනම සිංහල සහ English භාෂා දෙකම තියෙනවා. මුලින්ම පටන් ගන්නකොට භාෂාව තෝරගන්න පුළුවන් වගේම, ඕන වෙලාවක Settings වලින් මාරු කරගන්නත් පුළුවන්.",

      "faq6.q":             "ග්‍රහචාර Chat එක වැඩ කරන්නේ කොහොමද?",
      "faq6.a":             "ඔයා ප්‍රශ්නයක් ඇහුවම, ග්‍රහචාර AI එක ඔයාගේ කේන්දරේ (ග්‍රහ පිහිටීම්, භාව, දශා කාල) බලලා, මේ දවස්වල තියෙන ග්‍රහ මාරු එක්ක සසඳලා හරියටම ඔයාට ගැලපෙන උත්තරේ දෙනවා. නිකන් පොදු පලාපල නෙමෙයි.",

      /* Download CTA */
      "download.title":     "ඔයාගේ තරු කියවන්න ලෑස්තිද?",
      "download.desc":      "දැන්ම ග්‍රහචාර Download කරගන්න. උපන් විස්තර ඇතුළත් කරන්න. විශ්වයේ මඟ පෙන්වීම ලබා ගන්න.",
      "download.appstore":  "App Store",
      "download.appstoreSub": "Download on the",
      "download.playstore": "Google Play",
      "download.playstoreSub": "Get it on",

      /* Footer */
      "footer.taglineSi":   "ග්‍රහචාර — ඔබේ පුද්ගලික ජ්‍යෝතිෂවේදියා",
      "footer.tagline":     'පුරාණ වේද දැනුමයි, නවීන තාක්ෂණයයි.<br>ශ්‍රී ලංකාවේ ❤️ ආදරයෙන් හදපු නිපැයුමක් 🇱🇰',
      "footer.product":     "නිෂ්පාදනය",
      "footer.resources":   "Resources",
      "footer.legal":       "නීතිමය",
      "footer.features":    "විශේෂාංග",
      "footer.pricing":     "මිල ගණන්",
      "footer.screenshots": "තිරපිටපත්",
      "footer.download":    "බාගන්න",
      "footer.apiDocs":     "API Docs",
      "footer.blog":        "බ්ලොග්",
      "footer.changelog":   "වෙනස්කම්",
      "footer.status":      "Status",
      "footer.privacy":     "Privacy Policy",
      "footer.terms":       "Terms of Service",
      "footer.cookies":     "Cookie Policy",
      "footer.contact":     "සම්බන්ධ කරගන්න",
      "footer.copyright":   "© 2026 ග්‍රහචාර. සියලු හිමිකම් ඇවිරිණි."
    }
  };

  /* ── Language engine ────────────────────────────────────────────── */
  var currentLang = localStorage.getItem('grahachara-lang') || 'en';

  function applyTranslations(lang) {
    var dict = translations[lang];
    if (!dict) return;

    currentLang = lang;
    localStorage.setItem('grahachara-lang', lang);

    // Set html lang attribute and direction
    document.documentElement.lang = lang === 'si' ? 'si' : 'en';

    // Toggle Sinhala body class for font switching
    document.body.classList.toggle('lang-si', lang === 'si');
    document.body.classList.toggle('lang-en', lang === 'en');

    // Update all data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (dict[key] !== undefined) {
        el.innerHTML = dict[key];
      }
    });

    // Update document title
    if (lang === 'si') {
      document.title = 'ග්‍රහචාර — ශ්‍රී ලංකාවේ #1 වේද ජ්‍යෝතිෂ යෙදුම';
    } else {
      document.title = "Grahachara — Sri Lanka's #1 Vedic Astrology App";
    }

    // Update meta description
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      if (lang === 'si') {
        metaDesc.setAttribute('content', 'ශ්‍රී ලංකාවේ #1 වේද ජ්‍යෝතිෂ යෙදුම. රාහු කාල, පොරොන්දම, උපත් පත්‍ර, පුද්ගලික ජ්‍යෝතිෂ chat, සහ තවත් — සිංහල සහ English වලින්.');
      } else {
        metaDesc.setAttribute('content', "Sri Lanka's #1 Vedic astrology app. Rahu Kalaya, Porondam, birth charts, personal astrologer chat, and more — in Sinhala & English.");
      }
    }

    // Update lang toggle button text
    var langBtn = document.getElementById('langToggle');
    if (langBtn) {
      var langLabel = langBtn.querySelector('.lang-toggle__label');
      if (langLabel) {
        langLabel.textContent = lang === 'si' ? 'EN' : 'සිං';
      }
    }
  }

  /* ── Initialize on DOM ready ────────────────────────────────────── */
  function initI18n() {
    // Apply saved or default language
    applyTranslations(currentLang);

    // Bind toggle button
    var langBtn = document.getElementById('langToggle');
    if (langBtn) {
      langBtn.addEventListener('click', function (e) {
        e.preventDefault();
        var newLang = currentLang === 'en' ? 'si' : 'en';
        applyTranslations(newLang);
      });
    }
  }

  // Run init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initI18n);
  } else {
    initI18n();
  }

  // Expose for external use
  window.GrahacharaI18n = {
    setLang: applyTranslations,
    getLang: function () { return currentLang; },
    translations: translations
  };

})();
