/**
 * Internationalization (i18n) - Multi-language support
 * Sinhala, Tamil, English
 */

const translations = {
  en: {
    // Common
    appName: 'Nakath AI',
    tagline: 'Your Personal AI Astrologer',
    loading: 'Loading...',
    readingStars: 'Reading the stars...',
    error: 'Something went wrong',
    retry: 'Retry',
    share: 'Share',
    close: 'Close',
    cancel: 'Cancel',
    confirm: 'Confirm',
    today: 'Today',
    selectDate: 'Select Date',
    selectTime: 'Select Time',
    selectedDate: 'Selected Date',
    resetToToday: 'Reset to Today',
    datePickerTitle: 'Pick a Date & Time',

    // Tab names
    tabHome: 'Today',
    tabPorondam: 'Porondam',
    tabKendara: 'Kendara',
    tabChat: 'Ask AI',
    chatTitle: 'AI Astrologer',
    askUniverse: 'Ask the universe anything...',
    chatPlaceholder: 'Type your question here...',
    consultingCosmos: 'Consulting the cosmos...',
    initialChat: 'Greetings! I am your personal Vedic AI Astrologer. \u2728\nAsk me anything about your future, career, or relationships.',
    starsClouded: 'The stars are cloudy right now... I could not see clearly. \u2601\uFE0F',
    cosmosConnectionFailed: 'Lost connection with the cosmos. Please check your internet. \uD83D\uDCE1',
    tabHoroscope: 'Horoscope',
    tabProfile: 'Profile',
    tabReport: 'Report',

    // Report screen
    reportTitle: 'Full Jyotish Report',
    reportSubtitle: 'Comprehensive life reading based on your birth chart',
    reportGenerate: 'Generate My Report',
    reportEnterBirth: 'Enter your birth date & time',
    reportLoading: 'Calculating your cosmic blueprint...',
    reportYogas: 'Planetary Yogas',
    reportPersonality: 'Personality & Character',
    reportMarriage: 'Marriage & Relationships',
    reportCareer: 'Career & Finance',
    reportChildren: 'Children & Family',
    reportLifePredictions: 'Life Predictions',
    reportMentalHealth: 'Mind & Intellect',
    reportBusiness: 'Business Growth',
    reportTransits: 'Current Transits',
    reportRealEstate: 'Property & Assets',
    reportEmployment: 'Employment',
    reportFinancial: 'Financial Plan',
    reportTimeline: '25-Year Timeline',
    reportRemedies: 'Remedies',
    reportCurrentDasha: 'Current Dasha',
    reportAntardasha: 'Current Sub-Period',
    reportStrong: 'Strong',
    reportModerate: 'Moderate',
    reportWeak: 'Weak',
    reportChallenged: 'Challenged',
    reportBenefic: 'Benefic',
    reportMalefic: 'Malefic',
    reportNeutral: 'Neutral',

    // Home screen
    goodMorning: 'Good Morning ☀️',
    goodAfternoon: 'Good Afternoon 🌤️',
    goodEvening: 'Good Evening 🌙',
    rahuKalaya: 'Rahu Kalaya',
    rahuKalayaBilingual: 'රාහු කාලය / Rahu Kalaya',
    rahuWarning: '⚠️ Rahu Kalaya is active now - Avoid new activities',
    rahuSafe: '✅ Rahu Kalaya is not active - Safe to proceed',
    starts: 'Starts',
    ends: 'Ends',
    todayNakath: "Today's Auspicious Times",
    noAuspicious: 'No special auspicious periods for this date',
    sunrise: 'Sunrise',
    sunset: 'Sunset',
    panchanga: 'Panchanga',
    panchangaBilingual: '📿 Panchanga / පංචාංගය',
    auspiciousTimesBilingual: '🕐 Auspicious Times / ශුභ නැකැත්',
    tithi: 'Tithi',
    tithiBilingual: 'තිථි / Tithi',
    nakshatra: 'Nakshatra',
    nakshatraBilingual: 'Nakshatra / නක්ෂත්‍ර',
    yoga: 'Yoga',
    yogaBilingual: 'Yoga / යෝග',
    karana: 'Karana',
    karanaBilingual: 'Karana / කරණ',
    moonSign: 'Moon Sign',
    sunSign: 'Sun Sign',

    // Porondam
    porondamTitle: 'Marriage Compatibility',
    porondamSubtitle: 'Check your Porondam score (out of 20)',
    brideDetails: 'Bride Details',
    groomDetails: 'Groom Details',
    birthDate: 'Birth Date & Time',
    checkCompatibility: 'Check Compatibility',
    vibeCheck: '💫 Send a Vibe Check',
    vibeCheckDesc: 'Generate a link to share on WhatsApp',
    score: 'Score',
    outOf: 'out of',

    // DST
    dstTitle: 'Daylight Saving Time (Sri Lanka)',
    dstWarning: 'Your birth date falls within a DST period!',
    dstSelect: 'Select DST Option',
    dstNone: 'No DST Applied',
    dstExplain: 'If born during DST period, enter hospital clock time and select DST option. We will auto-correct.',
    dstCorrectedTime: 'Corrected Birth Time',
    hospitalTime: 'Hospital Clock Time',
    birthPlace: 'Birth Place',
    birthPlaceholder: 'e.g., Colombo, Kandy, Galle',

    // Kendara
    kendaraTitle: 'Birth Chart (කේන්දර)',
    kendaraSubtitle: 'Generate your Vedic birth chart',
    kendaraGenerate: 'Generate Kendara',
    kendaraUpload: 'Upload Kendara Photo',
    kendaraOrCreate: 'Or Create from Birth Details',
    kendaraNakshatra: 'Birth Nakshatra',
    kendaraRashi: 'Moon Sign (Rashi)',
    kendaraSunSign: 'Sun Sign',
    kendaraLagna: 'Lagna (Ascendant)',
    kendaraPanchanga: 'Birth Panchanga',
    kendaraPersonality: 'Personality Traits',
    kendaraShare: 'Share Kendara',
    selectBirthDate: 'Select Birth Date',
    selectBirthTime: 'Select Birth Time',
    tapToSelect: 'Tap to select',
    compatible: 'Compatible',
    shareResult: 'Share Result',
    factorsBreakdown: 'Porondam Breakdown',
    doshasFound: 'Doshas Found',

    // Kendara Extra
    mysticChart: 'Mystic Chart',
    unveilBlueprint: 'Unveil Your Soul Blueprint',
    enterBirthDetails: 'Enter Birth Details',
    dateOfBirth: 'Date of Birth',
    timeOfBirth: 'Time of Birth',
    birthLocation: 'Birth Location',
    illuminateChart: 'Illuminate My Path',
    failedToDrawMap: 'Failed to draw star map',
    ascendantLagna: 'Ascendant (Lagna)',
    lord: 'Lord',
    celestialPositions: 'Celestial Positions',
    planet: 'Planet',
    rashi: 'Rashi',
    degree: 'Degree',
    divineYogas: 'Divine Yogas',
    soulImprint: 'Soul Imprint',
    rashiChart: 'Rashi Chart',
    navamshaChart: 'Navamsha Chart',
    chart: 'Chart',
    planets: 'Planets',
    report: 'Report',
    astralSecrets: 'Astral Secrets',
    dasaTimeline: '25-Year Dasa Timeline',
    children: 'Children',
    futureInsights: 'Future Insights',
    marriage: 'Marriage',
    wealth: 'Wealth',

    // Rashi Names - English
    mesha: 'Aries',
    vrishabha: 'Taurus',
    mithuna: 'Gemini',
    kataka: 'Cancer',
    simha: 'Leo',
    kanya: 'Virgo',
    thula: 'Libra',
    vrischika: 'Scorpio',
    dhanu: 'Sagittarius',
    makara: 'Capricorn',
    kumbha: 'Aquarius',
    meena: 'Pisces'
  },
  si: {
    // Common
    appName: 'නකත් AI 🇱🇰',
    tagline: 'ඔයාගේම AI ජ්‍යෝතිෂවේදියා \uD83D\uDC51',
    loading: 'පොඩ්ඩක් ඉන්න, ගණනය කරමින්... \uD83C\uDF1F',
    error: 'අවුලක් වුනා',
    retry: 'ආයි බලන්න',
    share: 'යාලුවන්ට යවන්න',
    close: 'වහන්න',
    cancel: 'එපා',
    confirm: 'හරි',
    today: 'අද \uD83D\uDCC5',
    selectDate: 'දිනය',
    selectTime: 'වේලාව',
    selectedDate: 'තෝරාගත් දවස',
    resetToToday: 'අද දවසට යන්න \uD83D\uDD19',
    datePickerTitle: 'දිනය සහ වේලාව',
    am: 'උදේ',
    pm: 'හවස',

    // Tab names
    tabHome: 'ගෙදර',
    tabPorondam: 'පොරොන්දම්',
    tabKendara: 'කේන්දරේ',
    tabChat: 'චැට්',
    chatTitle: 'AI ජ්‍යෝතිෂවේදියා',
    askUniverse: 'විශ්වයෙන් ඕන දෙයක් අහන්න...',
    chatPlaceholder: 'ඔබේ ප්‍රශ්නය මෙතන ලියන්න...',
    consultingCosmos: 'තරු පරීක්ෂා කරමින්... \uD83C\uDF1F',
    tabHoroscope: 'පලාපල',
    tabProfile: 'මම',
    tabReport: 'රිපෝට්',

    // Report screen
    reportTitle: '\uD83D\uDD2E සම්පූර්ණ ජීවිත පලාපල',
    reportSubtitle: 'ඔයාගේ කේන්දරේ හැමදේම මෙතන තියෙනවා',
    reportGenerate: '\uD83D\uDE80 මගේ රිපෝට් එක ගන්න',
    reportEnterBirth: 'උපන් විස්තර දීලා බලන්න',
    reportLoading: 'ඔයාගේ විස්තර සොයමින්... \uD83E\uDDE9',
    reportYogas: 'ඔයාට තියෙන යෝග \uD83D\uDCAB',
    reportPersonality: 'ඔයාගේ චරිතය කොහොමද?',
    reportMarriage: 'විවාහය සහ ආදරය \uD83D\uDC91',
    reportCareer: 'රැකියාව',
    reportChildren: 'දරුවෝ ගැන',
    reportLifePredictions: 'විශේෂ අනාවැකි \uD83D\uDCDC',
    reportMentalHealth: 'හිතේ ස්වභාවය',
    reportBusiness: 'බිස්නස් ගැන',
    reportTransits: 'දැන් ග්‍රහයෝ ඉන්නේ කොහොමද?',
    reportRealEstate: 'ඉඩකඩම් සහ වාහන',
    reportEmployment: 'රස්සාව',
    reportFinancial: 'සල්ලි ප්‍රශ්න',
    reportTimeline: 'ඉස්සරහට මොකද වෙන්නේ? (අවු 25ක්)',
    reportRemedies: 'දෝෂ වලට කරන්න ඕන දේවල්',
    reportCurrentDasha: 'දැන් යන මහ දශාව',
    reportAntardasha: 'අතුරු දශාව',
    reportStrong: 'සුපිරි \uD83D\uDCAA',
    reportModerate: 'ශේප්',
    reportWeak: 'පොඩ්ඩක් අවුල්',
    reportChallenged: 'පරිස්සම් වෙන්න ⚠️',
    reportBenefic: 'සුභයි',
    reportMalefic: 'අසුභයි',
    reportNeutral: 'සාමාන්‍යයි',

    // Home screen
    goodMorning: 'සුභ උදෑසනක් වේවා! ☀️',
    goodAfternoon: 'සුභ දහවලක් වේවා! 🌤️',
    goodEvening: 'සුභ සන්ධ්‍යාවක් වේවා! 🌙',
    rahuKalaya: 'රාහු කාලේ (පොඩ්ඩක් බලාගෙන) \u26A0\uFE0F',
    rahuKalayaBilingual: 'රාහු කාලය / Rahu Kalaya',
    rahuWarning: '\u26A0\uFE0F රාහු කාලේ යන්නේ. පොඩ්ඩක් ඉවසමු.',
    rahuSafe: '\u2705 රාහු කාලේ ඉවරයි. දැන් ගේම ගහමු!',
    starts: 'පටන් ගන්නේ',
    ends: 'ඉවර වෙන්නේ',
    todayNakath: 'අද සුභ වෙලාවල් \u23F0',
    noAuspicious: 'අද විශේෂ නැකැත් නෑ, සාමාන්‍ය විදියට කරමු',
    sunrise: 'ඉර පායන වෙලාව',
    sunset: 'ඉර බහින වෙලාව',
    panchanga: 'පංචාංගය \uD83D\uDCDC',
    panchangaBilingual: '\uD83D\uDFF0 පංචාංගය / Panchanga',
    auspiciousTimesBilingual: '\uD83D\uDD50 සුභ වෙලාවන් / Auspicious Times',
    tithi: 'තිථිය',
    tithiBilingual: 'තිථි / Tithi',
    nakshatra: 'නැකත',
    nakshatraBilingual: 'නැකත / Nakshatra',
    yoga: 'යෝගය',
    yogaBilingual: 'යෝග / Yoga',
    karana: 'කරණය',
    karanaBilingual: 'කරණ / Karana',
    moonSign: 'චන්ද්‍ර රාශිය',
    sunSign: 'සූර්ය රාශිය',

    // Porondam
    porondamTitle: '\u2764\uFE0F විවාහ ගැලපීම්',
    porondamSubtitle: 'ඔයාලා දෙන්නා ගැලපෙනවද බලමු?',
    brideDetails: 'කෙල්ලගේ විස්තර \uD83D\uDC70',
    groomDetails: 'කොල්ලගේ විස්තර \uD83E\uDD35',
    birthDate: 'උපන් දවස',
    checkCompatibility: '\uD83D\uDC98 ගැලපෙනවද බලන්න',
    vibeCheck: '\uD83D\uDCAB Vibe Check පාරක් දාමු',
    vibeCheckDesc: 'WhatsApp එකේ යාලුවන්ට යවන්න',
    score: 'ලකුණු',
    outOf: 'න්',

    // DST
    dstTitle: 'වෙලාව වෙනස් වෙච්ච කාල (DST)',
    dstWarning: 'ඔයා ඉපදෙනකොට ලංකාවේ වෙලාව වෙනස් කරලා තිබිලා තියෙන්නේ! \u23F3',
    dstSelect: 'හරි වෙලාව තෝරන්න',
    dstNone: 'වෙලාව වෙනස් නෑ',
    dstExplain: 'ඔයා ඉපදුනේ වෙලාව වෙනස් කරපු කාලෙක නම්, හොස්පිට්ල් කාඩ් එකේ තියෙන වෙලාවම දාන්න. අපි ඒක හදලා ගන්නම්.',
    dstCorrectedTime: 'හදපු වෙලාව',
    hospitalTime: 'කාඩ් එකේ වෙලාව',
    birthPlace: 'උපන් ගම',
    birthPlaceholder: 'අනුරාධපුරය, මාතර...',

    // Kendara
    kendaraTitle: '\uD83D\uDD2E මගේ කේන්දරේ',
    kendaraSubtitle: 'තත්පරෙන් කේන්දරේ හදාගන්න',
    kendaraGenerate: '\u2728 කේන්දරේ හදන්න',
    kendaraUpload: '\uD83D\uDCF7 කේන්දරේ ෆොටෝ එකක් දාන්න',
    kendaraOrCreate: 'නැත්නම් විස්තර ටිකක් දාන්න',
    kendaraNakshatra: 'නැකත',
    kendaraRashi: 'රාශිය',
    kendaraSunSign: 'සූර්ය රාශිය',
    kendaraLagna: 'ලග්නය',
    kendaraPanchanga: 'උපන් පංචාංගය',
    kendaraPersonality: 'ඔයාගේ හැටි \uD83E\uDDD1',
    kendaraShare: '\uD83D\uDCE4 කේන්දරේ Share කරන්න',
    selectBirthDate: 'උපන් දවස',
    selectBirthTime: 'උපන් වෙලාව',
    tapToSelect: 'තෝරන්න',
    compatible: 'සුපිරියට ගැලපෙනවා \u2764\uFE0F',
    shareResult: 'රිසාල්ට් එක යවන්න',
    factorsBreakdown: 'විස්තර',
    doshasFound: '\uD83D\uDD34 දෝෂ තියෙනවා',

    // Kendara Extra
    mysticChart: 'කේන්දර පරීක්ෂාව',
    unveilBlueprint: 'ඔයාගේ අනාගතය මෙහෙමයි',
    enterBirthDetails: 'විස්තර දාන්න',
    dateOfBirth: 'උපන් දිනය',
    timeOfBirth: 'උපන් වේලාව',
    birthLocation: 'උපන් ස්ථානය',
    illuminateChart: '\uD83C\uDF20 කේන්දරේ හදමු',
    failedToDrawMap: 'කේන්දරේ හදන්න බැරි වුනා',
    ascendantLagna: 'ලග්නය',
    lord: 'අධිපති',
    celestialPositions: 'ග්‍රහ පිහිටීම්',
    planet: 'ග්‍රහයා',
    rashi: 'රාශිය',
    degree: 'අංශක',
    divineYogas: 'ඔයාට තියෙන යෝග',
    soulImprint: 'ආත්මීය සටහන',
    rashiChart: 'රාශි චක්‍රය',
    navamshaChart: 'නවාංශක චක්‍රය',
    chart: 'කේන්දරේ',
    planets: 'ග්‍රහයෝ',
    report: 'පලාපල',
    astralSecrets: 'රහස්',
    dasaTimeline: 'දශා කාල',
    children: 'දරුවෝ',
    futureInsights: 'අනාගතේ',
    marriage: 'මැරේජ් එක',
    wealth: 'සල්ලි',

    // Tab Chat
    tabChat: 'චැට්',
    initialChat: 'ආයුබෝවන්! \uD83D\uDE4F මම ඔයාගේ AI ජ්‍යෝතිෂ මිතුරිය. \u2728\nඅනාගතේ ගැන, රස්සාව ගැන, මැරේජ් එක ගැන ඕන දෙයක් මගෙන් අහන්න.',
    starsClouded: 'තරු පේන්නේ නෑ වගේ... පොඩ්ඩක් ඉන්න. ☁️',
    cosmosConnectionFailed: 'සිග්නල් අවුලක් වගේ. ඉන්ටනෙට් බලලා එන්න! \uD83D\uDCE1',

    // Rashi Names - Sinhala (Keeping formal names as they are standard terms)
    mesha: 'මේෂ',
    vrishabha: 'වෘෂභ',
    mithuna: 'මිථුන',
    kataka: 'කටක',
    simha: 'සිංහ',
    kanya: 'කන්‍යා',
    thula: 'තුලා',
    vrischika: 'වෘශ්චික',
    dhanu: 'ධනු',
    makara: 'මකර',
    kumbha: 'කුම්භ',
    meena: 'මීන'
  }
};

let currentLanguage = 'en';
let listeners = [];

export const setLanguage = (lang) => {
  if (translations[lang]) {
    currentLanguage = lang;
    listeners.forEach((l) => l(lang));
  }
};

export const getLanguage = () => currentLanguage;

export const t = (key) => {
  const keys = key.split('.');
  let value = translations[currentLanguage];
  
  for (const k of keys) {
    if (value && value[k]) {
      value = value[k];
    } else {
      // Fallback to English
      value = translations['en'];
      for (const enK of keys) {
        if (value && value[enK]) {
          value = value[enK];
        } else {
          return key;
        }
      }
      return value || key;
    }
  }
  
  return value;
};

export const subscribe = (listener) => {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
};

export default { t, setLanguage, getLanguage, subscribe };
