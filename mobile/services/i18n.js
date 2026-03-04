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
    tabHoroscope: 'Horoscope',
    tabProfile: 'Profile',

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
    appName: 'නකත් AI',
    tagline: 'ඔබේ පුද්ගලික AI ජ්‍යෝතිෂ් උපදේශකයා',
    loading: 'පොඩ්ඩක් ඉන්න...',
    error: 'පොඩි අවුලක් උනා',
    retry: 'ආයි බලන්න',
    share: 'යාලුවොන්ට යවන්න',
    close: 'වහන්න',
    cancel: 'එපා',
    confirm: 'හරි',
    today: 'අද',
    selectDate: 'දවස තෝරන්න',
    selectTime: 'වෙලාව තෝරන්න',
    selectedDate: 'තෝරාගත් දවස',
    resetToToday: 'අද දවසට යන්න',
    datePickerTitle: 'දවස සහ වෙලාව තෝරන්න',
    am: 'පෙ.ව.',
    pm: 'ප.ව.',

    // Tab names
    tabHome: 'අද දවස',
    tabPorondam: 'පොරොන්දම්',
    tabKendara: 'කේන්දරේ',
    tabChat: 'අහන්න',
    tabHoroscope: 'පලාපල',
    tabProfile: 'මම',

    // Home screen
    goodMorning: 'සුභ උදෑසනක් වේවා! ☀️',
    goodAfternoon: 'සුභ දවාලක් වේවා! 🌤️',
    goodEvening: 'සුභ සැන්දෑවක් වේවා! 🌙',
    rahuKalaya: 'රාහු කාලය (නරක වෙලාව)',
    rahuKalayaBilingual: 'රාහු කාලය / Rahu Kalaya',
    rahuWarning: '⚠️ දැන් රාහු කාලයයි! අලුත් වැඩ පටන් ගන්න එපා.',
    rahuSafe: '✅ රාහු කාලේ ඉවරයි. දැන් වැඩ පටන් ගත්තට කමක් නෑ.',
    starts: 'පටන් ගන්නේ',
    ends: 'ඉවර වෙන්නේ',
    todayNakath: 'අද දවසේ සුභ වෙලාවන්',
    noAuspicious: 'අද විශේෂ සුභ වෙලාවල් නෑ වගේ',
    sunrise: 'ඉර පායන වෙලාව',
    sunset: 'ඉර බහින වෙලාව',
    panchanga: 'පංචාංගය (ලිත)',
    panchangaBilingual: '📿 පංචාංගය / Panchanga',
    auspiciousTimesBilingual: '🕐 සුභ වෙලාවන් / Auspicious Times',
    tithi: 'තිථිය (චන්ද්‍ර දවස)',
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
    porondamTitle: 'විවාහ ගැලපීම් (පොරොන්දම්)',
    porondamSubtitle: 'ඔයාලා දෙන්නා කීයක් දුරට ගැලපෙනවද කියලා බලමු (20න්)',
    brideDetails: 'මනාලියගේ විස්තර',
    groomDetails: 'මනාලයාගේ විස්තර',
    birthDate: 'උපන් දවස සහ වෙලාව',
    checkCompatibility: 'ගැලපෙනවද බලන්න',
    vibeCheck: '💫 වයිබ් චෙක් එකක් දාන්න',
    vibeCheckDesc: 'WhatsApp එකේ ශෙයා කරන්න ලින්ක් එකක් හදාගන්න',
    score: 'එකතුව',
    outOf: 'න්',

    // DST
    dstTitle: 'වේලාව වෙනස් වූ කාල සීමා (DST)',
    dstWarning: 'ඔයා ඉපදුනු කාලේ ලංකාවේ වෙලාව වෙනස් කරලා තිබුනා!',
    dstSelect: 'නිවැරදි වෙලාව තෝරන්න',
    dstNone: 'වෙලාව වෙනස් වෙලා නෑ',
    dstExplain: 'ඔයා ඉපදුනේ වෙලාව වෙනස් කරපු කාලෙක නම්, හොස්පිට්ල් කාඩ් එකේ තියෙන වෙලාවම දාන්න. අපි ඒක හරිගස්සලා ගන්නම්.',
    dstCorrectedTime: 'හරිගස්සපු උපන් වෙලාව',
    hospitalTime: 'උප්පැන්නෙ තියෙන වෙලාව',
    birthPlace: 'උපන් ගම',
    birthPlaceholder: 'උදා: කොළඹ, නුවර, ගාල්ල',

    // Kendara
    kendaraTitle: 'මගේ කේන්දරේ',
    kendaraSubtitle: 'ඔයාගේ උපන් වෙලාවට අනුව කේන්දරේ හදාගන්න',
    kendaraGenerate: 'කේන්දරේ හදන්න',
    kendaraUpload: 'කේන්දරේ ෆොටෝ එකක් දාන්න',
    kendaraOrCreate: 'නැත්නම් උපන් විස්තර දාලා හදන්න',
    kendaraNakshatra: 'උපන් නැකත',
    kendaraRashi: 'ලග්නය',
    kendaraSunSign: 'සූර්ය රාශිය',
    kendaraLagna: 'ලග්නය',
    kendaraPanchanga: 'උපන් පංචාංගය',
    kendaraPersonality: 'ඔයාගේ ගතිගුණ',
    kendaraShare: 'කේන්දරේ යවන්න',
    selectBirthDate: 'උපන් දවස',
    selectBirthTime: 'උපන් වෙලාව',
    tapToSelect: 'තෝරන්න',
    compatible: 'ගැලපෙනවා',
    shareResult: 'ප්‍රතිඵලය යවන්න',
    factorsBreakdown: 'පොරොන්දම් විස්තරේ',
    doshasFound: 'දෝෂ තියෙනවා',

    // Kendara Extra
    mysticChart: 'කේන්දර පරීක්ෂාව',
    unveilBlueprint: 'ඔබේ ආත්මීය සිතියම',
    enterBirthDetails: 'උපන් විස්තර ඇතුලත් කරන්න',
    dateOfBirth: 'උපන් දිනය',
    timeOfBirth: 'උපන් වේලාව',
    birthLocation: 'උපන් ස්ථානය',
    illuminateChart: ' කේන්දරය සාදන්න',
    failedToDrawMap: 'කේන්දරය සෑදීමට නොහැකි විය',
    ascendantLagna: 'ලග්නය',
    lord: 'අධිපති',
    celestialPositions: 'ග්‍රහ පිහිටීම්',
    planet: 'ග්‍රහයා',
    rashi: 'රාශිය',
    degree: 'අංශක',
    divineYogas: 'ප්‍රබල යෝග',
    soulImprint: 'ආත්මීය සටහන',
    rashiChart: 'රාශි චක්‍රය',
    navamshaChart: 'නවාංශක චක්‍රය',
    chart: 'කේන්දර සටහන',
    planets: 'ග්‍රහයන්',
    report: 'පලාපල',
    astralSecrets: 'සැඟවුණු නැකැත්',
    dasaTimeline: 'දශා කාල සීමා',
    children: 'දරුවන්',
    futureInsights: 'අනාගත පලාපල',
    marriage: 'විවාහය',
    wealth: 'ධනය',

    // Rashi Names - Sinhala
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
  },

  ta: {
    // Common
    appName: 'நகத் AI',
    tagline: 'உங்கள் தனிப்பட்ட AI ஜோதிடர்',
    loading: 'ஏற்றுகிறது...',
    readingStars: 'நட்சத்திரங்களைப் படிக்கிறது...',
    error: 'எதோ தவறு ஏற்பட்டது',
    retry: 'மீண்டும் முயற்சிக்கவும்',
    share: 'பகிர்',
    close: 'மூடு',
    cancel: 'ரத்து செய்',
    confirm: 'உறுதிப்படுத்தவும்',
    today: 'இன்று',
    selectDate: 'தேதி தேர்ந்தெடுக்கவும்',
    selectTime: 'நேரத்தை தேர்ந்தெடுக்கவும்',
    selectedDate: 'தேர்ந்தெடுக்கப்பட்ட தேதி',
    resetToToday: 'இன்றுக்கு மீட்டமைக்கவும்',
    datePickerTitle: 'தேதி மற்றும் நேரத்தைத் தேர்ந்தெடுக்கவும்',

    // Tab names
    tabHome: 'இன்று',
    tabPorondam: 'பொருத்தம்',
    tabKendara: 'கேந்தரா',
    tabChat: 'AI க்கு கேளுங்கள்',
    tabHoroscope: 'ஜோதிடம்',
    tabProfile: 'சுயவிவரம்',

    // Home screen
    goodMorning: 'காலை வணக்கம் ☀️',
    goodAfternoon: 'மதிய வணக்கம் 🌤️',
    goodEvening: 'மாலை வணக்கம் 🌙',
    rahuKalaya: 'ராஹு காலம்',
    rahuKalayaBilingual: 'රාහු කාලය / Rahu Kalaya',
    rahuWarning: '⚠️ ராஹு காலம் தற்போது செயல்பட்டு வருகிறது - புதிய செயல்பாடுகளைத் தவிர்க்கவும்',
    rahuSafe: '✅ ராஹு காலம் செயல்படவில்லை - தொடர பாதுகாப்பாக உள்ளது',
    starts: 'ஆரம்பம்',
    ends: 'முடிவு',
    todayNakath: "இன்றைய நகத் நேரங்கள்",
    noAuspicious: 'இந்த தேதிக்கு எந்த சிறப்பு நன்மை காலங்களும் இல்லை',
    sunrise: 'கதிர் எழும் நேரம்',
    sunset: 'கதிர் மறையும் நேரம்',
    panchanga: 'பஞ்சாங்கம்',
    panchangaBilingual: '📿 பஞ்சாங்கம் / Panchanga',
    auspiciousTimesBilingual: '🕐 நன்மை நேரங்கள் / Auspicious Times',
    tithi: 'திதி',
    tithiBilingual: 'தி. / Tithi',
    nakshatra: 'நக்ஷத்திரம்',
    nakshatraBilingual: 'நக்ஷத்திரம் / Nakshatra',
    yoga: 'யோகம்',
    yogaBilingual: 'யோகம் / Yoga',
    karana: 'கரணம்',
    karanaBilingual: 'கரணம் / Karana',
    moonSign: 'சந்திர ராசி',
    sunSign: 'சூரிய ராசி',

    // Porondam
    porondamTitle: 'திருமணம் பொருத்தம்',
    porondamSubtitle: 'உங்கள் பொருந்தம் மதிப்பீட்டைச் சரிபார்க்கவும் (20 இல் இருந்து)',
    brideDetails: 'மணமகளின் விவரங்கள்',
    groomDetails: 'மணமகனின் விவரங்கள்',
    birthDate: 'பிறப்பு தேதி மற்றும் நேரம்',
    checkCompatibility: 'பொருத்தத்தைச் சரிபார்க்கவும்',
    vibeCheck: '💫 ஒரு வைபை சரிபார்ப்பு அனுப்பவும்',
    vibeCheckDesc: 'வாட்ஸ்அப் இல் பகிர வலைப்பின்னல் உருவாக்கவும்',
    score: 'மதிப்பீடு',
    outOf: 'இல் இருந்து',

    // DST
    dstTitle: 'நாள் வெளிச்ச சேமிப்பு நேரம் (இலங்கை)',
    dstWarning: 'உங்கள் பிறப்பு தேதி ஒரு DST காலப்பகுதியில் உள்ளது!',
    dstSelect: 'DST விருப்பத்தைத் தேர்ந்தெடுக்கவும்',
    dstNone: 'DST பயன்பாடு இல்லை',
    dstExplain: 'DST காலப்பகுதியில் பிறந்தால், மருத்துவமனையின் கடிகார நேரத்தை உள்ளிடவும் மற்றும் DST விருப்பத்தைத் தேர்ந்தெடுக்கவும். நாங்கள் தானாகவே சரிசெய்வோம்.',
    dstCorrectedTime: 'சரிசெய்யப்பட்ட பிறப்பு நேரம்',
    hospitalTime: 'மருத்துவமனையின் கடிகார நேரம்',
    birthPlace: 'பிறப்பு இடம்',
    birthPlaceholder: 'எடுத்துக்காட்டு: கொழும்பு, கண்டி, களே',

    // Kendara
    kendaraTitle: 'பிறப்பு அட்டை (கேந்தரா)',
    kendaraSubtitle: 'வேத ஜோதிட பிறப்பு அட்டை',
    kendaraGenerate: 'கேந்தரா உருவாக்கவும்',
    kendaraUpload: 'கேந்தரா புகைப்படம் பதிவேற்றவும்',
    kendaraOrCreate: 'அல்லது பிறப்பு விவரங்களிலிருந்து உருவாக்கவும்',
    kendaraNakshatra: 'பிறப்பு நட்சத்திரம்',
    kendaraRashi: 'சந்திர ராசி (ராசி)',
    kendaraSunSign: 'சூரிய ராசி',
    kendaraLagna: 'லக்னம் (Lagna)',
    kendaraPanchanga: 'பிறப்பு பஞ்சாங்கம்',
    kendaraPersonality: 'ஆளுமைப் பண்புகள்',
    kendaraShare: 'கேந்தரா பகிரவும்',
    selectBirthDate: 'பிறப்பு தேதி தேர்ந்தெடுக்கவும்',
    selectBirthTime: 'பிறப்பு நேரம் தேர்ந்தெடுக்கவும்',
    tapToSelect: 'தேர்ந்தெடுக்க தட்டவும்',
    compatible: 'பொருத்தம்',
    shareResult: 'முடிவைப் பகிரவும்',
    factorsBreakdown: 'பொருத்தம் விவரம்',
    doshasFound: 'தோஷங்கள் கண்டறியப்பட்டன',

    // Kendara Extra
    mysticChart: 'மர்ம வரைபடம்',
    unveilBlueprint: 'உங்கள் அண்ட வரைபடத்தை வெளிப்படுத்துங்கள்',
    enterBirthDetails: 'பிறப்பு விவரங்களை உள்ளிடவும்',
    dateOfBirth: 'பிறந்த தேதி',
    timeOfBirth: 'பிறந்த நேரம்',
    birthLocation: 'பிறப்பு இடம்',
    illuminateChart: 'வரைபடத்தை ஒளிரச் செய்யுங்கள்',
    failedToDrawMap: 'அண்ட வரைபடத்தை வரைய முடியவில்லை',
    rashiChart: 'ராசி வரைபடம் (D1)',
    navamshaChart: 'நவாம்சம் வரைபடம் (D9)',
    divineYogas: 'தெய்வீக யோகங்கள்',
    character: 'அடையாளம்',
    marriage: 'திருமணம் & உறவுகள்',
    wealth: 'செல்வம்',

    // Rashi Names - Tamil
    mesha: 'மேஷம்',
    vrishabha: 'விருச்சிகம்',
    mithuna: 'மிதுனம்',
    kataka: 'கடகம்',
    simha: 'சிம்மம்',
    kanya: 'கன்னி',
    thula: 'துலா',
    vrischika: 'விருச்சிகம்',
    dhanu: 'தனுசு',
    makara: 'மகரம்',
    kumbha: 'கும்பம்',
    meena: 'மீனம்',
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
