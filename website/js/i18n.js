/* ═══════════════════════════════════════      "trust.ayanamsha":    "🔮 Authentic Astronomical Calculations",
      "trust.nakshatras":   "🧭 27 Constellations · 12 Signs · 9 Planets",══════════════════════════════
   Grahachara — Internationalization (i18n) Engine
   Full Sinhala (සිංහල) + English support
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────────────────────────
     Translation dictionaries
     ───────────────────────────────────────────────────────────────── */
  var translations = {
    /* ─────────────────────────────────────────────────────────────────
       English (Global, Premium SEO & Marketing)
       ───────────────────────────────────────────────────────────────── */
    en: {
      /* Nav */
      "nav.features":       "Features",
      "nav.howItWorks":     "How It Works",
      "nav.screenshots":    "Interface",
      "nav.kendara":        "Birth Chart",
      "nav.porondam":       "Compatibility",
      "nav.fullreport":     "Life Report",
      "nav.pricing":        "Pricing",
      "nav.reviews":        "Testimonials",
      "nav.faq":            "FAQ",
      "nav.download":       "Get the App",
      "nav.downloadMobile": "Get App",
      "nav.weeklyLagna":    "Weekly Horoscopes",

      /* Hero */
      "hero.badge":         "The World's Most Advanced AI Astrologer",
      "hero.titleLine1":    "Unlock Your Destiny,",
      "hero.titleAccent":   "Master Your Future.",
      "hero.subtitle":      'Harness 5,000 years of profound astrological wisdom empowered by cutting-edge AI. Experience ultra-precise birth chart analysis, cosmic compatibility mapping, real-time planetary transits, and your own 24/7 personal astrologer.',
      "hero.btnDownload":   "Download Now",
      "hero.btnExplore":    "Discover Features",
      "hero.scroll":        "Explore the Cosmos",

      /* Trust strip */
      "trust.madeIn":       "🌍 Trusted by seekers globally",
      "trust.privacy":      "🛡️ Bank-level Privacy — Your data is sacred",
      "trust.ayanamsha":    "🔮 Authentic Lahiri Ayanamsha",
      "trust.nakshatras":   "📿 27 Nakshatras · 12 Rashis · 9 Grahas",
      "trust.price":        "💎 Elite Planetary Guidance — {SUB_PRICE}/mo",

      /* Features section */
      "features.label":     "Premium Features",
      "features.title":     "Complete Cosmic Intelligence",
      "features.desc":      "Discover 6 powerful, meticulously crafted tools designed to reveal the hidden patterns of your life, relationships, and ultimate purpose.",

      "feat1.title":        "Real-Time Transits & Alerts",
      "feat1.desc":         "Never miss a cosmic window. Receive location-based alerts for inauspicious times, daily auspicious windows, lunar phases, and star alignments.",
      "feat1.tag1":         "GPS Synced",
      "feat1.tag2":         "Smart Alerts",
      "feat1.tag3":         "Full Calendar",

      "feat2.title":        "Cosmic Compatibility",
      "feat2.desc":         "Deep astrological matchmaking based on traditional compatibility systems. Analyze key energetic metrics to find your perfect match.",
      "feat2.tag1":         "7 Key Metrics",
      "feat2.tag2":         "Out of 20 Score",
      "feat2.tag3":         "Compatibility Analysis",

      "feat3.title":        "24/7 AI Astrologer Chat",
      "feat3.desc":         "Have a burning question? Chat instantly with our AI that acts as your personal master astrologer, referencing your exact birth chart for every answer.",
      "feat3.tag1":         "1-on-1 Guidance",
      "feat3.tag2":         "Chart Aware",
      "feat3.tag3":         "Dream Meaning",

      "feat4.title":        "The Comprehensive Life Report",
      "feat4.desc":         "A masterfully detailed blueprint of your life journey. Explore 22 profound chapters covering career, wealth karma, soul purpose, and a 25-year predictive timeline.",
      "feat4.tag1":         "22 Chapters",
      "feat4.tag2":         "Deep Insights",
      "feat4.tag3":         "PDF Keepsake",

      "feat5.title":        "Precision Birth Chart",
      "feat5.desc":         "Your soul's unique fingerprint mapped out using traditional algorithms. View planetary positions, main chart, subdivisions, and precise timeline periods.",
      "feat5.tag1":         "Main + Subdivision",
      "feat5.tag2":         "Precision System",
      "feat5.tag3":         "Timeline Periods",

      "feat6.title":        "Bilingual Interface",
      "feat6.desc":         "Seamlessly toggle between English for our global audience and Sinhala for deeper cultural resonance. Total localized freedom.",
      "feat6.tag1":         "Global English",
      "feat6.tag2":         "Native Sinhala",

      /* How it works */
      "how.label":          "Methodology",
      "how.title":          "Reveal Your Destiny in 3 Steps",

      "how.step1.title":    "Enter Your Birth Coordinates",
      "how.step1.desc":     "Provide your exact birth date, time, and location. Our engine utilizes precise NASA-grade ephemeris and highly accurate positioning models.",
      "how.step2.title":    "Astrological Processing",
      "how.step2.desc":     "Our proprietary AI analyzes the complex geometry of your planets, calculating auspicious alignments, challenges, and life cycles.",
      "how.step3.title":    "Receive Daily Strategy",
      "how.step3.desc":     "Get proactive guidance. Be notified of auspicious windows, prepare for major planetary shifts, and chat with your AI astrologer to navigate life.",

      /* Screenshots */
      "screenshots.label":  "Experience",
      "screenshots.title":  "A Glimpse Inside",
      "screenshots.desc":   "A beautifully designed, distraction-free interface built to elevate your spiritual journey.",
      "scr.home":           "Daily Dashboard",
      "scr.chat":           "Astrologer Chat",
      "scr.kendara1":       "Main Chart",
      "scr.kendara2":       "Planetary Dignity",
      "scr.kendara3":       "Subdivision Chart",
      "scr.kendara4":       "Life Timeline",
      "scr.report":         "Life Report",
      "scr.porondam":       "Compatibility",
      "scr.weeklyLagna":    "Weekly Horoscopes",
      "scr.swipe":          "← Swipe to explore →",

      /* Kendara Chart */
      "kendara.label":      "The Birth Chart",
      "kendara.title":      "Your Soul's Blueprint",
      "kendara.desc":       "Input your birth details to instantly generate a highly precise, multi-layered birth chart revealing your fundamental nature and life cycles.",
      "kendara.f1.title":   "The Main Birth Chart",
      "kendara.f1.desc":    "The foundational map. Explore your ascendant, house placements, planetary strengths, aspects, and profound alignments.",
      "kendara.f2.title":   "Planetary Mechanics",
      "kendara.f2.desc":    "View exact degrees, star placements, retrograde status, and precise mathematical strengths.",
      "kendara.f3.title":   "The Subdivision Chart",
      "kendara.f3.desc":    "The crucial subdivision chart revealing your soul's hidden purpose, delayed karma, and profound relational dynamics.",
      "kendara.f4.title":   "Life Cycle Timelines",
      "kendara.f4.desc":    "Navigate the major astrological time periods. Map out past karmic events and anticipate future multi-year cycles with striking accuracy.",
      "kendara.f5.title":   "Challenges & Obstacles",
      "kendara.f5.desc":    "Instantly detect life barriers, specific planetary afflictions, and receive actionable remedies to smooth your path.",

      /* Porondam Section */
      "porondam.label":     "Compatibility",
      "porondam.title":     "Relationship Matchmaking",
      "porondam.desc":      "A master-level compatibility report utilizing ancient systems, detecting crucial cosmic alignments and potential frictions between partners.",
      "porondam.f1.title":  "Comprehensive Harmony Analysis",
      "porondam.f1.desc":   "Examine astrological harmony factors to understand physical, mental, and spiritual compatibility.",
      "porondam.f2.title":  "Total Match Percentage",
      "porondam.f2.desc":   "Receive a definitive score out of 20 with a clear verdict, simplifying complex astrological math into actionable guidance for your future.",
      "porondam.f3.title":  "Planetary Affliction Checks",
      "porondam.f3.desc":   "Automatically identify severe relational challenges caused by planetary placements like Mars, complete with recommended remedies.",
      "porondam.f4.title":  "Seamless Sharing",
      "porondam.f4.desc":   "Instantly export your compatibility summary to WhatsApp to discuss with family, astrologers, or your prospective partner.",

      /* Full Report Section */
      "fullreport.label":   "The Life Report",
      "fullreport.title":   "Your Ultimate Cosmic Masterpiece",
      "fullreport.desc":    "A premium, 22-chapter deep dive into your entire existence. A profound written breakdown covering everything from innate psychological traits to long-term wealth indicators.",
      "fullreport.f1.title": "22 Dimensions of Analysis",
      "fullreport.f1.desc": "An expansive A-to-Z interpretation of your life covering career, wealth, health, intellect, relationships, and hidden talent.",
      "fullreport.f2.title": "The 25-Year Timeline",
      "fullreport.f2.desc": "Look ahead with confidence. A detailed forecast of the next 25 years based on your unfolding major and minor time periods.",
      "fullreport.f3.title": "Karmic Imprints & Soul",
      "fullreport.f3.desc": "Understand the momentum of your past lives. Identify your spiritual blockages and the evolutionary purpose charted by your nodes.",
      "fullreport.f4.title": "Heirloom PDF Keepsake",
      "fullreport.f4.desc": "Download a beautifully formatted, print-ready document to reference and reflect upon for the rest of your life.",

      /* Weekly Lagna */
      "weeklyLagna.label":     "Weekly Forecasts",
      "weeklyLagna.title":     "Navigate The Weeks Ahead",
      "weeklyLagna.desc":      "Stay ahead of the planetary weather. Receive exceptionally detailed weekly forecasts spanning career, love, health, and wealth for all 12 ascendants.",
      "weeklyLagna.f1.title":  "All 12 Signs Covered",
      "weeklyLagna.f1.desc":   "From dynamic Aries to intuitive Pisces, get specialized breakdowns customized for your exact rising sign.",
      "weeklyLagna.f2.title":  "Refreshed Every Monday",
      "weeklyLagna.f2.desc":   "Actionable insights updated weekly, aligning precisely with immediate planetary transits and retrogrades.",
      "weeklyLagna.f3.title":  "Multi-Faceted Guidance",
      "weeklyLagna.f3.desc":   "Every forecast delivers distinct sectors: professional momentum, romantic opportunities, physical vitality, and days of power.",
      "weeklyLagna.f4.title":  "Chart Contextualized",
      "weeklyLagna.f4.desc":   "No generic fluff. Our engine considers actual transit impacts relative to your natal positions, ensuring highly pertinent advice.",

      /* Pricing */
      "pricing.label":      "Investment",
      "pricing.title":      "Premium Guidance. Accessible Pricing.",
      "pricing.desc":       "Access elite astrological insights traditionally reserved for the few. Cancel anytime. No hidden fees.",

      "price1.badge":       "⭐ Full Access",
      "price1.amount":      "{SUB_PRICE}",
      "price1.period":      "/ month",
      "price1.savings":     "Secure checkout via Stripe / Apple Pay / Google Pay 💳",
      "price1.f1":          "Daily Transit & Astrological Time Alerts",
      "price1.f2":          "Complete Advanced Astrological Calendar",
      "price1.f3":          "Unlimited Birth Charts",
      "price1.f4":          "<strong>10 AI Astrologer Queries / Day</strong>",
      "price1.f5":          "Smart Push Notifications",
      "price1.f6":          "Dream Interpretation Engine",
      "price1.f7":          "Planetary Shift Warnings",
      "price1.f8":          "100% Ad-Free Experience",
      "price1.f9":          "Cancel completely hassle-free anytime",
      "price1.f10":         "Weekly Horoscopes",
      "price1.cta":         "Subscribe Now",

      "price2.badge":       "The Life Report",
      "price2.amount":      "{REP_PRICE}",
      "price2.period":      "per report",
      "price2.f1":          "<strong>A comprehensive 22-chapter breakdown</strong>",
      "price2.f2":          "Career, Wealth & Marriage Analysis",
      "price2.f3":          "25-Year Predictive Timeline",
      "price2.f4":          "Health & Vitality Overview",
      "price2.f5":          "Karmic Journey & Soul Purpose",
      "price2.f6":          "Premium high-res PDF Download",
      "price2.f7":          "Yours to keep forever",
      "price2.cta":         "Unlock Life Report",

      "price3.badge":       "Compatibility",
      "price3.amount":      "{POR_PRICE}",
      "price3.period":      "per check",
      "price3.f1":          "Full 7-Metric Energy Analysis",
      "price3.f2":          "Definitive Score out of 20",
      "price3.f3":          "Severe Conflict & Obstacle Detection",
      "price3.f4":          "Crystal clear, actionable advice",
      "price3.f5":          'Instant WhatsApp Sharing link',
      "price3.f6":          "Included Remedies & Suggestions",
      "price3.f7":          "Share with partners easily",
      "price3.cta":         "Check Compatibility",

      /* Testimonials */
      "testimonials.label": "Global Acclaim",
      "testimonials.title": "Trusted by Seekers Worldwide",

      "review1.text":       '"The compatibility analysis mirrored exactly what my professional astrologer told me, but delivered instantly on my phone. An indispensable tool. 🙏"',
      "review1.name":       "Marcus T.",
      "review1.loc":        "London, UK",

      "review2.text":       '"I consult the inauspicious time warnings daily before important meetings. Having it localized and pushed to my notifications is a game changer for my productivity."',
      "review2.name":       "Sarah J.",
      "review2.loc":        "New York, USA",

      "review3.text":       '"The Life Report was astonishingly accurate. It outlined chapters of my life I had kept entirely private. Worth every single cent, and then some."',
      "review3.name":       "Priya K.",
      "review3.loc":        "Toronto, Canada",

      /* FAQ */
      "faq.label":          "FAQ",
      "faq.title":          "Frequently Asked Questions",

      "faq1.q":             "What is the pricing structure?",
      "faq1.a":             "Access all premium features for {SUB_PRICE}/month. The expansive Life Report ({REP_PRICE}) and Compatibility Checks ({POR_PRICE}) are standalone purchases. No hidden fees.",

      "faq2.q":             "Which astrological system is used?",
      "faq2.a":             "We utilize mathematically authentic astronomical standards, ensuring the most accurate and widely accepted charting in astrology.",

      "faq3.q":             "How accurate are the planetary calculations?",
      "faq3.a":             "We employ NASA-grade ephemeris data (Meeus algorithms) to calculate planetary transits. Our time engine is hyper-localized, adapting to your exact GPS coordinates rather than a generalized time zone.",

      "faq4.q":             "Is my data private?",
      "faq4.a":             "Absolutely. We view your birth data as sacred. We employ bank-level encryption, never sell your data, and completely refuse ad-tracking. Your cosmic footprint is secure with us. 🌟",

      "faq5.q":             "What languages are supported?",
      "faq5.a":             "Grahachara is fully functional in both English (Global) and Sinhala. You can effortlessly switch your preference at any time from the settings menu.",

      "faq6.q":             "How does the AI astrologer chat work?",
      "faq6.a":             "Unlike generic fortune-telling, our AI references your unique birth chart against real-time planetary transits. It processes your specific astrological periods to provide profoundly personal, context-aware guidance.",

      /* Download CTA */
      "download.title":     "Ready to Master Your Future?",
      "download.desc":      "Download Grahachara today. Unlock elite astrological wisdom, precisely tailored to you.",
      "download.appstore":  "App Store",
      "download.appstoreSub": "Download on the",
      "download.playstore": "Google Play",
      "download.playstoreSub": "Get it on",

      /* Footer */
      "footer.taglineSi":   "Grahachara — Your Personal Astrologer",
      "footer.tagline":     'Ancient astrological wisdom, cutting-edge technology.<br>Empowering seekers across the globe 🌍',
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
      "footer.status":      "System Status",
      "footer.privacy":     "Privacy Policy",
      "footer.terms":       "Terms of Service",
      "footer.cookies":     "Cookie Policy",
      "footer.contact":     "Contact Support",
      "footer.copyright":   "© 2026 Grahachara. All rights reserved."
    },

    /* ─────────────────────────────────────────────────────────────────
       සිංහල (Sinhala - Local Sri Lankan Market)
       ───────────────────────────────────────────────────────────────── */
    si: {
      /* Nav */
      "nav.features":       "විශේෂාංග",
      "nav.howItWorks":     "වැඩ කරන්නේ කොහොමද?",
      "nav.screenshots":    "Screenshots",
      "nav.kendara":        "කේන්දරය",
      "nav.porondam":       "පොරොන්දම්",
      "nav.fullreport":     "ජීවිත වාර්තාව",
      "nav.pricing":        "මිල ගණන්",
      "nav.reviews":        "Reviews",
      "nav.faq":            "ප්‍රශ්න සහ පිළිතුරු",
      "nav.download":       "Download කරගන්න",
      "nav.downloadMobile": "Download කරගන්න",
      "nav.weeklyLagna":    "සතියේ පලාපල",

      /* Hero */
      "hero.badge":         "ශ්‍රී ලංකාවේ ප්‍රමුඛතම සහ විශ්වාසවන්තම ජ්‍යෝතිෂ යෙදුම",
      "hero.titleLine1":    "ඔබේ අනාගතය,",
      "hero.titleAccent":   "නිවැරදිවම දැනගන්න",
      "hero.subtitle":      'ශ්‍රී ලාංකීය අපටම උරුම වුණු පුරාණ ජ්‍යෝතිෂ දැනුම, අලුත්ම කෘතීම බුද්ධිය (AI) සමගින්. නිවැරදිම රාහු කාලය, ඔබේම උපන් වෙලාවට හැදූ කේන්දරේ, නිවැරදි පොරොන්දම් ගැලපීම් සහ ඔබේම AI ජ්‍යෝතිෂවේදියා සමගින් Chat කරන්න — සියල්ල සිංහලෙන්ම.',
      "hero.btnDownload":   "Download කරගන්න",
      "hero.btnExplore":    "විශේෂාංග බලන්න",
      "hero.scroll":        "තව විස්තර බලන්න",

      /* Trust strip */
      "trust.madeIn":       "🇱🇰 ශ්‍රී ලාංකික අපේම නිපැයුමක්",
      "trust.privacy":      "🛡️ Privacy First — ඔබගේ දත්ත 100% ක් ආරක්ෂිතයි",
      "trust.ayanamsha":    "🔮 ලාහිරි අයනාංශ (සම්ප්‍රදායික)",
      "trust.nakshatras":   "📿 නක්ෂත්‍ර 27 · රාශි 12 · ග්‍රහ 9",
      "trust.price":        "💰 සියලුම පහසුකම් — {SUB_PRICE} කට පමණයි",

      /* Features section */
      "features.label":     "විශේෂාංග",
      "features.title":     "ඔබේ ජන්ම පත්‍රය කියවන්න පුළුවන් ප්‍රබලම මෙවලම",
      "features.desc":      "සුභ මුහුර්ත වල ඉඳන් ජීවිතේ ගැඹුරුම තැන් ගැන විශ්ලේෂණය කරන්න පුළුවන් ප්‍රබල ටූල්ස් 6ක්.",

      "feat1.title":        "රාහු කාලය සහ දවසේ නැකත්",
      "feat1.desc":         "ඔබ ඉන්න ප්‍රදේශයටම හරියන්න හැදූ රාහු කාලය Notification එකකින්ම බලාගන්න. තිථි, නක්ෂත්‍ර, යෝග, කරණ — මොන වෙලාවට වෙනස් වෙනවද කියලා හරියටම දැනගන්න.",
      "feat1.tag1":         "GPS මගින්",
      "feat1.tag2":         "Push Notifications",
      "feat1.tag3":         "පංචාංග",

      "feat2.title":        "පොරොන්දම් ගැලපීම",
      "feat2.desc":         "අපේ සම්ප්‍රදායික ලකුණු 20 ක්‍රමයට පොරොන්දම් ගලපන්න. දින, ගණ, යෝනි, එකම රාශි, වශ්‍ය, නාඩි සහ මහේන්ද්‍ර වගේ හැම දෙයක්ම කටු සටහන් නැතුව පැහැදිලිව සිංහලෙන් බලාගන්න.",
      "feat2.tag1":         "සාධක 7ක්",
      "feat2.tag2":         "ලකුණු 20න්",
      "feat2.tag3":         "දෝෂ පරීක්ෂාව",

      "feat3.title":        "ග්‍රහචාර Chat",
      "feat3.desc":         "රස්සාව, ආදරය, සෞඛ්‍යය, සුභ වෙලාවල් ගැන ඕනම දෙයක් අහන්න. ග්‍රහචාර AI එක ඔබගේම කේන්දරේ බලලා, අද දවසේ තියෙන ග්‍රහ මාරු එක්ක ගලපලා හරියටම උත්තරේ දෙනවා.",
      "feat3.tag1":         "Personal සහාය",
      "feat3.tag2":         "උපත් පත්‍රේ බලලමයි",
      "feat3.tag3":         "හීන පලාපල",

      "feat4.title":        "සම්පූර්ණ ජීවිත වාර්තාව (Life Report)",
      "feat4.desc":         "ඔබේ චරිතය, රස්සාව, විවාහය, දරුවෝ, සෞඛ්‍යය, සල්ලි, පෙර පින්, සහ ඉස්සරහට එන අවුරුදු 25 ගැන කියවෙන සම්පූර්ණ PDF වාර්තාවක්.",
      "feat4.tag1":         "මාතෘකා 22ක්",
      "feat4.tag2":         "පැහැදිලි සිංහලෙන්",
      "feat4.tag3":         "PDF එකක් විදිහට",

      "feat5.title":        "කේන්දරේ — උපත් පත්‍රය",
      "feat5.desc":         "සාම්ප්‍රදායික ක්‍රමයට හදපු නිවැරදිම කේන්දරය. ග්‍රහයෝ 9 දෙනා, ලග්නය, නවාංශකය, දශා කාල සහ මාරක අපල ගැන ඔක්කොම සවිස්තරාත්මකව.",
      "feat5.tag1":         "රාශි + නවාංශ",
      "feat5.tag2":         "KP ක්‍රමය",
      "feat5.tag3":         "දශා විස්තර",

      "feat6.title":        "සිංහල සහ English",
      "feat6.desc":         "App එකේ හැම තැනකම සිංහල සහ English භාෂා දෙකම තියෙනවා. ලේසි භාෂාවක් තෝරගන්න පුළුවන්.",
      "feat6.tag1":         "සිංහල",
      "feat6.tag2":         "English",

      /* How it works */
      "how.label":          "වැඩ කරන්නේ මෙහෙමයි",
      "how.title":          "පියවර 3කින් ඔක්කොම දැනගන්න",

      "how.step1.title":    "උපන් විස්තර දාන්න",
      "how.step1.desc":     "ඔබ ඉපදුණු දිනය, වේලාව සහ ස්ථානය ලබා දෙන්න. අපි රජයේත් පිළිගන්නා 'ලාහිරි අයනාංශ' ක්‍රමය භාවිතා කරන නිසා කේන්දරේ අතිශයින්ම නිවැරදියි.",
      "how.step2.title":    "ග්‍රහචාර ගණනය කිරීම් සිදු කරයි",
      "how.step2.desc":     "පොත් පත් නැතිව ක්ෂණිකව ඔබගේ ග්‍රහ පිහිටීම්, යෝග, දෝෂ, දශා කාල ඔක්කොම ගණනය කරලා, කාට වුණත් තේරෙන සරල සිංහලෙන් විස්තරය ලබා දෙනවා.",
      "how.step3.title":    "දිනපතා මඟ පෙන්වීම",
      "how.step3.desc":     "රාහු කාලය ගැන notification එනවා. දවසේ නැකත් බලන්න, ග්‍රහ මාරු ගැන දැනගන්න, ඕන වෙලාවක AI Astrologer එක්ක Chat කරන්න පුළුවන්.",

      /* Screenshots */
      "screenshots.label":  "තිරපිටපත්",
      "screenshots.title":  "App එක ඇතුළේ...",
      "screenshots.desc":   "අපිටම ගැලපෙන්න, හරිම ලස්සනට සහ පිරිසිදුව හදපු Design එකක්.",
      "scr.home":           "Home — දවසේ නැකත්",
      "scr.chat":           "ග්‍රහචාර Chat",
      "scr.kendara1":       "කේන්දරය — රාශි",
      "scr.kendara2":       "කේන්දරය — ග්‍රහයන්",
      "scr.kendara3":       "කේන්දරය — නවාංශකය",
      "scr.kendara4":       "කේන්දරය — දශා",
      "scr.report":         "ජීවිත වාර්තාව",
      "scr.porondam":       "පොරොන්දම් ගැලපීම",
      "scr.weeklyLagna":    "සතියේ ලග්න පලාපල",
      "scr.swipe":          "← Swipe කරලා බලන්න →",

      /* Kendara Chart */
      "kendara.label":      "උපත් පත්‍රය (කේන්දරය)",
      "kendara.title":      "ඔබේ කේන්දරය, බොහොම සරලව",
      "kendara.desc":       "උපන් දිනය, වේලාව සහ ස්ථානය ලබා දෙන්න — ග්‍රහචාර මගින් ඔබේ රාශි සටහන, නවාංශකය සහ දශා කාල ඇතුළුව සම්පූර්ණ කේන්දරය ක්ෂණිකව සකසා දෙනු ඇත.",
      "kendara.f1.title":   "රාශි සටහන (D1)",
      "kendara.f1.desc":    "ලාහිරි අයනාංශ ක්‍රමයට අනුව සකසා ඇති භාව 12, ග්‍රහ බල දුබලතා, දෘෂ්ටි සහ යෝග ඇතුළත් සම්පූර්ණ ජන්ම පත්‍රය.",
      "kendara.f2.title":   "ග්‍රහ පිහිටීම්",
      "kendara.f2.desc":    "උපන් මොහොතේ ග්‍රහයන් සිටි අංශක, නක්ෂත්‍ර පාද, වක්‍ර වීම් සහ ෂඩ්බල වැනි සියුම් තොරතුරු බලාගන්න.",
      "kendara.f3.title":   "නවාංශකය (D9)",
      "kendara.f3.desc":    "විවාහය සහ ග්‍රහයන්ගේ සැබෑ බලය පෙන්වන, ජීවිතයේ සැඟවුණු අරමුණු හෙළි කරන වැදගත්ම වර්ග පත්‍රය.",
      "kendara.f4.title":   "දශා කාල",
      "kendara.f4.desc":    "විම්ශෝත්තරී මහ දශා, අන්තර් දශා අනුව ඔබේ ජීවිතයේ අතීත, වර්තමාන සහ අනාගත පලාපල කාල වකවානු සමඟ බලාගන්න.",
      "kendara.f5.title":   "මාරක අපල පරීක්ෂාව",
      "kendara.f5.desc":    "බාධක, මාරක සහ කේන්ද්‍රාධිපති දෝෂ ක්ෂණිකව හඳුනාගන්න. අපල කාලවලදී කළ යුතු ශාන්තිකර්ම සහ පිළියම් දැනුවත් වෙන්න.",

      /* Porondam Section */
      "porondam.label":     "පොරොන්දම්",
      "porondam.title":     "විවාහ ගැලපීම - සම්ප්‍රදායික පරීක්ෂාව",
      "porondam.desc":      "පොරොන්දම් 20 සම්පූර්ණ ගැලපීම් වාර්තාව. කුජ දෝෂ ඇතුළු දෝෂ පරීක්ෂාවන්, ග්‍රහ පිහිටීම් සහ ශාන්තිකර්ම.",
      "porondam.f1.title":  "දස සහ විසි පොරොන්දම් විග්‍රහය",
      "porondam.f1.desc":   "දින, ගණ, මහේන්ද්‍ර, ස්ත්‍රී දීර්ඝ, යෝනි, රාශි, රාශි අධිපති, වශ්‍ය, රජ්ජු, වේධ ඇතුළු සියලුම සාම්ප්‍රදායික පොරොන්දම්.",
      "porondam.f2.title":  "ගැලපීම් ප්‍රතිශතය (% Match)",
      "porondam.f2.desc":   "ලකුණු 20 න් ලැබෙන අගය සහ සමස්ත ගැලපීම් ප්‍රතිශතය. ඔබට ගැලපෙනම සහකරු තෝරාගැනීමට පහසු වන සේ සකසා ඇත.",
      "porondam.f3.title":  "කුජ දෝෂ සහ නාග දෝෂ පරීක්ෂාව",
      "porondam.f3.desc":   "විවාහයට බාධා ඇති කරන කුජ දෝෂ, ශනි මංගල දෝෂ, නාග දෝෂ ස්වයංක්‍රීයව හඳුනාගැනීම සහ ඊට අදාළ ශාන්තිකර්ම.",
      "porondam.f4.title":  "වාර්තාව WhatsApp කරන්න",
      "porondam.f4.desc":   "ඔබේ පොරොන්දම් වාර්තාවේ සාරාංශය WhatsApp හරහා දෙමාපියන් හෝ සහකරු සමඟ පහසුවෙන් Share කරගත හැක.",

      /* Full Report Section */
      "fullreport.label":   "ජීවිත වාර්තාව",
      "fullreport.title":   "ඔබේ සම්පූර්ණ ජීවිත කතාව, තරු වලින්",
      "fullreport.desc":    "ඔබේ ජන්ම පත්‍රයට අනුව සකසන ලද, පරිච්ඡේද 22 කට අධික ගැඹුරු විශ්ලේෂණය. අධ්‍යාපනය, රැකියාව, විවාහය, ධනය, සෞඛ්‍යය ඇතුළු ජීවිතයේ සියලු අංශ ආවරණය කෙරේ.",
      "fullreport.f1.title": "මාතෘකා 22ක් යටතේ විග්‍රහය",
      "fullreport.f1.desc": "ඔබේ ලග්නය, නවාංශකය සහ ග්‍රහ පිහිටීම් ගැඹුරින් විමසා බලා සකස් කළ, ඔබේ ජීවිතයේ A to Z ආවරණය වන විශේෂ වාර්තාව.",
      "fullreport.f2.title": "වසර 25 ක මහ දශා පලාපල",
      "fullreport.f2.desc": "ඉදිරි වසර 25 තුළ ඔබේ ජීවිතයේ සිදුවන වෙනස්කම්, මහ දශා සහ අන්තර් දශා කාලවල දී ලැබෙන සුභ අසුභ ප්‍රතිඵල.",
      "fullreport.f3.title": "පෙර පින් සහ කර්ම ඵල",
      "fullreport.f3.desc": "ඔබේ පෙර පින් බලය, කර්ම බලපෑම්, සහ මෙම ආත්මයේ ඔබේ ආධ්‍යාත්මික දියුණුව සඳහා ග්‍රහයන්ගේ බලපෑම.",
      "fullreport.f4.title": "PDF පිටපතක් ලබාගන්න",
      "fullreport.f4.desc": "මුද්‍රණය කළ හැකි මට්ටමේ (Print-ready) PDF ගොනුවක් ලෙස ඔබේ වාර්තාව ඩවුන්ලෝඩ් කරගන්න. ජීවිත කාලයටම පරිශීලනය කළ හැක.",

      /* Weekly Lagna Palapala */
      "weeklyLagna.label":     "සතියේ ලග්න පලාපල",
      "weeklyLagna.title":     "සතියේ ලග්න පලාපල",
      "weeklyLagna.desc":      "ලග්න 12ටම අදාළ සතිපතා පලාපල ලබාගන්න. මේ සතියේ රැකියාව, ආදරය, සෞඛ්‍යය සහ මුදල් ගැන තරු කියන දේ දැනගන්න.",
      "weeklyLagna.f1.title":  "ලග්න 12ම ආවරණය",
      "weeklyLagna.f1.desc":   "මේෂ, වෘෂභ, මිථුන, කටක, සිංහ, කන්‍යා, තුලා, වෘශ්චික, ධනු, මකර, කුම්භ සහ මීන — සෑම ලග්නයකටම විස්තරාත්මක සතිපතා පලාපල.",
      "weeklyLagna.f2.title":  "සතිපතා යාවත්කාලීන වෙනවා",
      "weeklyLagna.f2.desc":   "සඳුදා දිනටම නව පලාපල. ග්‍රහ මාරු සහ ඔබේ ලග්න පත්‍රය මත පදනම්ව සකසන නවතම පලාපල.",
      "weeklyLagna.f3.title":  "රැකියාව, ආදරය සහ සෞඛ්‍යය",
      "weeklyLagna.f3.desc":   "සෑම සතිපතා කියවීමකදීම රැකියා ප්‍රවණතා, ආදර ජීවිතය, සෞඛ්‍ය අනතුරු ඇඟවීම්, මූල්‍ය තත්ත්වය සහ සතියේ සුභ දිනයන් ගැන විස්තර.",
      "weeklyLagna.f4.title":  "ඔබේ කේන්දරයට ගැලපෙන",
      "weeklyLagna.f4.desc":   "සාමාන්‍ය පලාපල නෙමෙයි — ග්‍රහචාර ඔබේ උපත් පත්‍රය සහ වත්මන් ග්‍රහ මාරු ඒකාබද්ධ කර ඔබේ ජීවිතයට සැබවින්ම අදාළ වන පලාපල ලබාදෙනවා.",

      /* Pricing */
      "pricing.label":      "මිල ගණන්",
      "pricing.title":      "සරලයි. වටිනාකමට සරිලන මිලක්.",
      "pricing.desc":       "කිසිදු සැඟවුණු ගාස්තුවක් නැත. මාසික සේවාවන් {SUB_PRICE} කින් අරඹන්න. ඕනෑම මොහොතක අවලංගු කළ හැක.",

      "price1.badge":       "⭐ හැම දේම හම්බෙනවා",
      "price1.amount":      "{SUB_PRICE}",
      "price1.period":      "/ මාසයට",
      "price1.savings":     "Visa / MasterCard / HelaPay / FriMi ඔස්සේ ආරක්ෂිතව ගෙවන්න 💳",
      "price1.f1":          "දිනපතා රාහු කාලය සහ නැකත්",
      "price1.f2":          "සම්පූර්ණ පංචාංගය",
      "price1.f3":          "උපත් පත්‍රය (කේන්දරය)",
      "price1.f4":          "<strong>දවසට Chat ප්‍රශ්න 10යි (10 Questions Only)</strong>",
      "price1.f5":          "Push notifications එනවා",
      "price1.f6":          "හීන පලාපල දැනගන්න",
      "price1.f7":          "ග්‍රහ මාරු ගැන දැනුම්දීම්",
      "price1.f8":          "Ads එන්නේ නෑ (100% Ad-Free)",
      "price1.f9":          "කැමති දවසක නවත්තන්න පුළුවන් (Cancel anytime)",
      "price1.f10":         "සතිපතා ලග්න පලාපල",
      "price1.cta":         "පටන් ගන්න — මාසෙට {SUB_PRICE}යි",

      "price2.badge":       "ජීවිත වාර්තාව",
      "price2.amount":      "{REP_PRICE}",
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
      "price3.amount":      "{POR_PRICE}",
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
      "testimonials.label": "පාරිභෝගික අදහස්",
      "testimonials.title": "ලංකාව පුරාම අය විශ්වාස කරනවා",

      "review1.text":       '"අපේ පවුලේ ජොතිෂ්‍ය මහත්මයා කියපු විදිහටම පොරොන්දම් ගැලපුණා — 18/20! ඒකෙ විස්තරේ ඊටත් වඩා හොඳයි. මාරම App එකක්. 🙏"',
      "review1.name":       "නිමේෂා එස්.",
      "review1.loc":        "මහනුවර",

      "review2.text":       '"වැඩට යන්න කලින් මම හැමදාම රාහු කාලය බලනවා. සිංහලෙන් තියෙන නිසා හරිම ලේසියි. නියම ලාංකික App එකක්!"',
      "review2.name":       "සඳුන් ජේ.",
      "review2.loc":        "කොළඹ",

      "review3.text":       '"ජීවිත වාර්තාව කියෙව්වම මට පුදුම හිතුනා. කවුරුත් නොදන්න මගේ දේවල් පවා ඒකෙ තිබුණා. වියදම් කරපු ගාණට වඩා ගොඩක් වටිනවා."',
      "review3.name":       "කවින්දි පෙරේරා",
      "review3.loc":        "ගාල්ල",

      /* FAQ */
      "faq.label":          "ප්‍රශ්න සහ පිළිතුරු",
      "faq.title":          "නිතර අහන ප්‍රශ්න",

      "faq1.q":             "ගාස්තුව කීයද?",
      "faq1.a":             "ග්‍රහචාර හි ප්‍රධාන පහසුකම් ඔක්කොටම යන්නේ මාසෙට {SUB_PRICE} යි. ජීවිත වාර්තාවට ({REP_PRICE}) සහ පොරොන්දම් ගැලපීමට ({POR_PRICE}) වෙන් වෙන් වශයෙන් ගෙවා ලබා ගත හැක (Google Play / App Store ඔස්සේ). සැඟවුණු ගාස්තු කිසිවක් නොමැත.",

      "faq2.q":             "මේක හදලා තියෙන්නේ මොන ක්‍රමයටද?",
      "faq2.a":             "අපි භාවිතා කරන්නේ ඉන්දියාවේ මෙන්ම ලංකාවේ බහුතරයක් ජ්‍යෝතිෂවේදීන් පිළිගන්නා 'ලාහිරි අයනාංශ' (Lahiri Ayanamsha) ක්‍රමයයි. එමනිසා ඔබගේ පවුලේ ජ්‍යෝතිෂවේදියා බලන ආකාරයටම මෙය ක්‍රියාත්මක වේ.",

      "faq3.q":             "මේක කොච්චර නිවැරදිද?",
      "faq3.a":             "ග්‍රහ ස්ථානගත වීම් ගණනය කිරීම සඳහා අපි ලොව පවතින නිවැරදිම තාරකා විද්‍යාත්මක (Ephemeris) දත්ත ඇල්ගොරිතම යොදා ගනිමු. පංචාංගය සකසන්නේත් හරියටම ඔබගේ GPS පිහිටුමට අනුවයි.",

      "faq4.q":             "මගේ පුද්ගලික තොරතුරු ආරක්ෂිතද?",
      "faq4.a":             "අනිවාර්යයෙන්ම. ඔබගේ උපන් දත්ත අපි කාටවත් විකුණන්නේවත්, Ads සඳහා භාවිතා කරන්නේවත් නැත. අපගේ පද්ධතිය බැංකු මට්ටමේ ආරක්ෂාවකින් සමන්විත වන අතර, ඔබගේ දත්ත ඔබට පමණක් සීමා වේ. 🌟",

      "faq5.q":             "මොන භාෂා වලින්ද වැඩ කරන්නේ?",
      "faq5.a":             "App එකේ සම්පූර්ණයෙන්ම සිංහල සහ English භාෂා දෙකම අන්තර්ගතයි. ඔබට අවශ්‍ය ඕනෑම මොහොතක Settings හරහා භාෂාව මාරු කර ගත හැක.",

      "faq6.q":             "ග්‍රහචාර Chat එක වැඩ කරන්නේ කොහොමද?",
      "faq6.a":             "මෙය සාමාන්‍ය පලාපල කීමක් නොවේ. ඔබගේ ප්‍රශ්නයට පිළිතුරු සෙවීමට ප්‍රථම AI කෘතීම බුද්ධිය මගින් ඔබගේ උපත් පත්‍රය, දශා කාල සහ අද දවසේ ග්‍රහ පිහිටීම් ගැඹුරින් විශ්ලේෂණය කර ඔබට විශේෂිත වූ සත්‍ය පිළිතුරක් ලබා දෙයි.",

      /* Download CTA */
      "download.title":     "ඔබේ අනාගතය දැනගන්න සූදානම්ද?",
      "download.desc":      "දැන්ම ග්‍රහචාර Download කරගෙන ඔබේ උපන් විස්තර ලබා දෙන්න. විශ්වයේ නිවැරදි ඉඟි ලබාගන්න.",
      "download.appstore":  "App Store",
      "download.appstoreSub": "Download on the",
      "download.playstore": "Google Play",
      "download.playstoreSub": "Get it on",

      /* Footer */
      "footer.taglineSi":   "ග්‍රහචාර — ඔබේ ජ්‍යෝතිෂවේදියා",
      "footer.tagline":     'පුරාණ වේද දැනුම, නවීන තාක්ෂණයෙන්.<br>ශ්‍රී ලංකාවේ ❤️ ආදරයෙන් නිපදවන ලදී 🇱🇰',
      "footer.product":     "නිෂ්පාදනය",
      "footer.resources":   "Resources",
      "footer.legal":       "නීතිමය දේවල්",
      "footer.features":    "විශේෂාංග",
      "footer.pricing":     "මිල ගණන්",
      "footer.screenshots": "තිරපිටපත්",
      "footer.download":    "බාගන්න",
      "footer.apiDocs":     "API Docs",
      "footer.blog":        "බ්ලොග්",
      "footer.changelog":   "වෙනස්කම්",
      "footer.status":      "System Status",
      "footer.privacy":     "Privacy Policy",
      "footer.terms":       "Terms of Service",
      "footer.cookies":     "Cookie Policy",
      "footer.contact":     "සම්බන්ධ කරගන්න",
      "footer.copyright":   "© 2026 ග්‍රහචාර. සියලුම හිමිකම් ඇවිරිණි."
    }
  };

  /* ── Geographic & Pricing Engine ─────────────────────────────────── */
  var currentCountry = localStorage.getItem('grahachara_country');
  var currentLang = localStorage.getItem('grahachara-lang');

  // Hardcoded price values based on country
  var prices = {
    LK: {
      sub: "LKR 280",
      rep: "LKR 380",
      por: "LKR 100"
    },
    GLOBAL: {
      sub: "$4.99",
      rep: "$5.99",
      por: "$1.99"
    }
  };

  function interpolatePrices(isLK) {
    var p = isLK ? prices.LK : prices.GLOBAL;
    var priceKeys = [
      'price1.amount', 'price1.cta', 'price2.amount', 'price3.amount', 'trust.price', 'faq1.a', 'pricing.desc'
    ];

    ['en', 'si'].forEach(function(lang) {
      priceKeys.forEach(function(key) {
        if(translations[lang][key]) {
             translations[lang][key] = translations[lang][key]
                .replace('{SUB_PRICE}', p.sub)
                .replace('{REP_PRICE}', p.rep)
                .replace('{POR_PRICE}', p.por);
        }
      });
    });
  }

  /* ── Language Engine ────────────────────────────────────────────── */

  function applyTranslations(lang) {
    var dict = translations[lang];
    if (!dict) return;

    currentLang = lang;
    localStorage.setItem('grahachara-lang', lang);

    document.documentElement.lang = lang === 'si' ? 'si' : 'en';

    document.body.classList.toggle('lang-si', lang === 'si');
    document.body.classList.toggle('lang-en', lang === 'en');

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (dict[key] !== undefined) {
        el.innerHTML = dict[key];
      }
    });

    var langAttr = 'data-lang-' + lang;
    document.querySelectorAll('img[data-lang-en][data-lang-si]').forEach(function (img) {
      var newSrc = img.getAttribute(langAttr);
      if (newSrc && img.getAttribute('src') !== newSrc) {
        img.setAttribute('src', newSrc);
      }
    });

    if (lang === 'si') {
      document.title = 'ග්‍රහචාර — ශ්‍රී ලංකාවේ ප්‍රමුඛතම වේද ජ්‍යෝතිෂ යෙදුම';
    } else {
      document.title = "Grahachara — The World's Most Advanced AI Astrologer";
    }

    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      if (lang === 'si') {
        metaDesc.setAttribute('content', 'ශ්‍රී ලංකාවේ ප්‍රමුඛතම වේද ජ්‍යෝතිෂ යෙදුම. රාහු කාල, පොරොන්දම, උපත් පත්‍ර සහ AI Chat — සිංහලෙන්.');
      } else {
        metaDesc.setAttribute('content', "The World's Most Advanced AI Astrologer. Discover precision birth charts, time alerts, and cosmic compatibility.");
      }
    }

    var langBtn = document.getElementById('langToggle');
    if (langBtn) {
      var langLabel = langBtn.querySelector('.lang-toggle__label');
      if (langLabel) {
        langLabel.textContent = lang === 'si' ? 'EN' : 'සිං';
      }
    }
  }

  /* ── Initialize on DOM ready ────────────────────────────────────── */
  function bindToggle() {
    var langBtn = document.getElementById('langToggle');
    if (langBtn) {
      var newBtn = langBtn.cloneNode(true);
      if(langBtn.parentNode) {
         langBtn.parentNode.replaceChild(newBtn, langBtn);
      }
      newBtn.addEventListener('click', function (e) {
        e.preventDefault();
        var newLang = currentLang === 'en' ? 'si' : 'en';
        applyTranslations(newLang);
      });
    }
  }

  function initI18n() {
    var isLK = (currentCountry === 'LK');
    interpolatePrices(isLK);
    applyTranslations(currentLang || 'en');
    bindToggle();
  }

  function runSetup() {
    if (currentCountry) {
       initI18n();
    } else {
       fetch('https://get.geojs.io/v1/ip/country.json')
         .then(res => res.json())
         .then(data => {
            var isLK = (data.country === 'LK' || data.country === 'LKA');
            currentCountry = isLK ? 'LK' : 'OTHER';
            localStorage.setItem('grajachara_country', currentCountry);
            
            if (!currentLang) {
                currentLang = isLK ? 'si' : 'en';
                localStorage.setItem('grajachara-lang', currentLang);
            }
            initI18n();
         })
         .catch(err => {
            currentCountry = 'LK';
            if(!currentLang) currentLang = 'si';
            initI18n();
         });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runSetup);
  } else {
    runSetup();
  }

  window.GrahacharaI18n = {
    setLang: applyTranslations,
    getLang: function () { return currentLang; },
    translations: translations
  };

})();
