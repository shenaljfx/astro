// Shared lagna copy + helpers. Extracted from the Home screen so the
// Profile tab (CosmicIdentity) can reuse the exact same readings/traits.

var PLANET_NAMES_SI = { Sun: 'සූර්යා', Moon: 'චන්ද්‍රා', Mars: 'කුජ', Mercury: 'බුධ', Jupiter: 'ගුරු', Venus: 'සිකුරු', Saturn: 'ශනි', Rahu: 'රාහු', Ketu: 'කේතු' };
var RASHI_LOOKUP = {
  Mesha: 'Mesha', mesha: 'Mesha', Aries: 'Mesha', aries: 'Mesha', 'මේෂ': 'Mesha',
  Vrishabha: 'Vrishabha', vrishabha: 'Vrishabha', Taurus: 'Vrishabha', taurus: 'Vrishabha', 'වෘෂභ': 'Vrishabha',
  Mithuna: 'Mithuna', mithuna: 'Mithuna', Gemini: 'Mithuna', gemini: 'Mithuna', 'මිථුන': 'Mithuna',
  Kataka: 'Kataka', kataka: 'Kataka', Cancer: 'Kataka', cancer: 'Kataka', 'කටක': 'Kataka',
  Simha: 'Simha', simha: 'Simha', Leo: 'Simha', leo: 'Simha', 'සිංහ': 'Simha',
  Kanya: 'Kanya', kanya: 'Kanya', Virgo: 'Kanya', virgo: 'Kanya', 'කන්‍යා': 'Kanya',
  Tula: 'Tula', tula: 'Tula', Libra: 'Tula', libra: 'Tula', 'තුලා': 'Tula',
  Vrischika: 'Vrischika', vrischika: 'Vrischika', Scorpio: 'Vrischika', scorpio: 'Vrischika', 'වෘශ්චික': 'Vrischika',
  Dhanus: 'Dhanus', dhanus: 'Dhanus', Sagittarius: 'Dhanus', sagittarius: 'Dhanus', 'ධනු': 'Dhanus',
  Makara: 'Makara', makara: 'Makara', Capricorn: 'Makara', capricorn: 'Makara', 'මකර': 'Makara',
  Kumbha: 'Kumbha', kumbha: 'Kumbha', Aquarius: 'Kumbha', aquarius: 'Kumbha', 'කුම්භ': 'Kumbha',
  Meena: 'Meena', meena: 'Meena', Pisces: 'Meena', pisces: 'Meena', 'මීන': 'Meena',
};

var RASHI_LOOKUP = {
  Mesha: 'Mesha', mesha: 'Mesha', Aries: 'Mesha', aries: 'Mesha', 'මේෂ': 'Mesha',
  Vrishabha: 'Vrishabha', vrishabha: 'Vrishabha', Taurus: 'Vrishabha', taurus: 'Vrishabha', 'වෘෂභ': 'Vrishabha',
  Mithuna: 'Mithuna', mithuna: 'Mithuna', Gemini: 'Mithuna', gemini: 'Mithuna', 'මිථුන': 'Mithuna',
  Kataka: 'Kataka', kataka: 'Kataka', Cancer: 'Kataka', cancer: 'Kataka', 'කටක': 'Kataka',
  Simha: 'Simha', simha: 'Simha', Leo: 'Simha', leo: 'Simha', 'සිංහ': 'Simha',
  Kanya: 'Kanya', kanya: 'Kanya', Virgo: 'Kanya', virgo: 'Kanya', 'කන්‍යා': 'Kanya',
  Tula: 'Tula', tula: 'Tula', Libra: 'Tula', libra: 'Tula', 'තුලා': 'Tula',
  Vrischika: 'Vrischika', vrischika: 'Vrischika', Scorpio: 'Vrischika', scorpio: 'Vrischika', 'වෘශ්චික': 'Vrischika',
  Dhanus: 'Dhanus', dhanus: 'Dhanus', Sagittarius: 'Dhanus', sagittarius: 'Dhanus', 'ධනු': 'Dhanus',
  Makara: 'Makara', makara: 'Makara', Capricorn: 'Makara', capricorn: 'Makara', 'මකර': 'Makara',
  Kumbha: 'Kumbha', kumbha: 'Kumbha', Aquarius: 'Kumbha', aquarius: 'Kumbha', 'කුම්භ': 'Kumbha',
  Meena: 'Meena', meena: 'Meena', Pisces: 'Meena', pisces: 'Meena', 'මීන': 'Meena',
};

var LAGNA_UI_COPY = {
  Mesha: {
    readingEn: 'Aries Rising gives you a direct, brave, action-first nature. You usually move before others are ready, and your chart shows strength when you take the lead with discipline instead of impatience.',
    readingSi: 'මේෂ ලග්නයෙන් ඉපදුණු ඔබට තියෙන්නේ නිර්භීත, ක්‍රියාශීලී, නායකත්ව ලක්ෂණ පිරුණු ස්වභාවයක්. අනිත් අයට කලින් ඉස්සරහට යන්න ඔබට පුළුවන්. හැබැයි ඉක්මන් වෙන එක පොඩ්ඩක් පාලනය කරලා වැඩ කළොත්, ජීවිතේ ලොකු ජයග්‍රහණ ගන්න එක ඔබට ගේමක් නැහැ.',
    personalityEn: 'Your strongest pattern is courage in motion, you learn by doing and win when your energy has a clear direction.',
    personalitySi: 'ඔබේ ලොකුම ප්ලස් පොයින්ට් එක තමයි වැඩක් කරන්න බය නැතුව ඉස්සරහට යන එක. ඔබේ සහජ හැකියාවෙන් පැහැදිලි අරමුණක් තියාගෙන වැඩ කළොත්, ඉක්මනින් සාර්ථක ප්‍රතිඵල ගන්න ඔබට පුළුවන්.',
    traitsEn: ['Brave', 'Fast starter', 'Independent', 'Protective'],
    traitsSi: ['නිර්භීතයි', 'ඉක්මන් ආරම්භය', 'ස්වාධීනයි', 'ආරක්ෂාකාරීයි'],
    gem: { en: 'Red Coral', si: 'රතු පබළු' },
    color: { en: 'Red, Orange', si: 'රතු, තැඹිලි' },
  },
  Vrishabha: {
    readingEn: 'Taurus Rising gives you a steady, tasteful, and dependable personality. You build life patiently, value comfort and loyalty, and do best when your plans are practical and financially grounded.',
    readingSi: 'වෘෂභ ලග්නයෙන් ඉපදුණු ඔබ කැමති ස්ථාවර, කලබල නැති, නිදහස් ජීවිතේකට. වැඩක් පටන් ගත්තොත් බොහොම ඉවසීමෙන් ඒක ගොඩනගනවා. සල්ලි ගැනත්, ජීවිතේ ගැනත් ප්‍රායෝගිකව හිතලා වැඩ කරන නිසා ඔබට ලොකු සාර්ථකත්වයකට යන්න පුළුවන්.',
    personalityEn: 'Your strength is consistency, you move slowly when needed but rarely give up on something that truly matters.',
    personalitySi: 'ඔබේ ලොකුම ශක්තිය තමයි මේ නොසැලෙන ස්ථාවරත්වය. වෙලාවකට වැඩ ටිකක් හිමින් කළත්, අත්‍යවශ්‍ය දේවල් කොහොම හරි අත්නාරින එක තමයි ඔබේ විශේෂත්වය.',
    traitsEn: ['Steady', 'Loyal', 'Tasteful', 'Determined'],
    traitsSi: ['ස්ථාවරයි', 'විශ්වාසවන්තයි', 'රසකාමීයි', 'අධිෂ්ඨානශීලීයි'],
    gem: { en: 'Diamond', si: 'දියමන්ති' },
    color: { en: 'White, Cream, Pink', si: 'සුදු, ක්‍රීම්, රෝස' },
  },
  Mithuna: {
    readingEn: 'Gemini Rising gives you a quick mind, flexible thinking, and a natural gift for words. You understand people through conversation and often succeed where ideas, learning, trade, or communication are important.',
    readingSi: 'මිථුන ලග්නයෙන් ඉපදුණු ඔබට තියෙන්නේ මාර තියුණු මොළයක්. ඕනෙම තත්ත්වෙකට හැඩගැහෙන්න ඔබට පුළුවන්. අලුත් අදහස් හොයන්න, කතාබහ කරන්න ඔබට තියෙන්නේ උපන් දක්ෂතාවයක්. මේ නිසා ඔබට ඉක්මනින් ඉස්සරහට යන්න පුළුවන්.',
    personalityEn: 'Your chart shows a mind that connects patterns quickly, but your best results come when you finish one clear path before chasing the next idea.',
    personalitySi: 'ඔබේ මනස මාර ස්පීඩ් එකට දේවල් ග්‍රහණය කරගන්නවා. හැබැයි අලුත් දෙයක් පස්සේ යන්න කලින්, පටන් ගත්ත දේ ඉවරයක් කරනවා නම් ඔබට මාරම රිසල්ට් එකක් ගන්න පුළුවන්.',
    traitsEn: ['Quick-minded', 'Communicative', 'Adaptable', 'Curious'],
    traitsSi: ['බුද්ධිමත්', 'කතාබහට දක්ෂයි', 'හැඩගැසෙනසුළුයි', 'කුතුහලයෙන් පිරිලා'],
    gem: { en: 'Emerald', si: 'මරකත' },
    color: { en: 'Green, Light Yellow', si: 'කොළ, ලා කහ' },
  },
  Kataka: {
    readingEn: 'Cancer Rising gives you emotional depth, intuition, and a protective heart. Home, family, memory, and belonging shape many of your choices, and you often sensitive to what others feel before they say it.',
    readingSi: 'කටක ලග්නයෙන් ඉපදුණු ඔබ හරිම සංවේදී, හැඟීම්බර කෙනෙක්. අනිත් අයව ආදරෙන් බලාගන්න ඔබට තියෙන්නේ මාර හදවතක්. පවුලේ අය, නිවස ගැන ඔබ හුඟක් හිතනවා. අනිත් අයගේ හැඟීම් කල්තියා තේරුම් ගන්න එක ඔබට සහජයෙන්ම පිහිටලා තියෙනවා.',
    personalityEn: 'Your sensitivity is not weakness, it is your way of reading the room and protecting what matters.',
    personalitySi: 'ඔබේ සංවේදීකම තියෙන්නේ දුර්වලකමකට නෙවෙයි, අනිත් අයව තේරුම් අරන් ඔබට වටින දේවල් ආරක්ෂා කරගන්න තමයි ඒක පිහිටලා තියෙන්නේ.',
    traitsEn: ['Intuitive', 'Caring', 'Protective', 'Family-minded'],
    traitsSi: ['සංවේදී', 'කරුණාවන්තයි', 'පවුලට ලැදියි', 'ආරක්ෂාකාරීයි'],
    gem: { en: 'Pearl', si: 'මුතු' },
    color: { en: 'White, Silver', si: 'සුදු, රිදී' },
  },
  Simha: {
    readingEn: 'Leo Rising gives you presence, pride, and a natural wish to create something meaningful. You are noticed easily, and your life opens when confidence is guided by generosity and responsibility.',
    readingSi: 'සිංහ ලග්නයෙන් ඉපදුණු ඔබ පෙනුමෙන් වගේම වැඩෙනුත් කැපී පේන කෙනෙක්. සහජ නායකයෙක් විදිහට ඉස්සරහට යන්න ඔබට පුළුවන්. ආත්ම විශ්වාසය, කරුණාව එකතු කරලා වගකීමෙන් වැඩ කළොත්, හැමෝම ආදරය කරන ජනප්‍රිය චරිතයක් වෙන්න ඔබට අමාරු නැහැ.',
    personalityEn: 'Your personality carries warmth and authority, people respond when you lead with heart rather than ego.',
    personalitySi: 'ඔබ ළඟ තියෙන උණුසුම් හදවත සහ අන් අයට උදව් කරන්න තියෙන උනන්දුව නිසා ඔබට ලොකු පිළිගැනීමක් ලැබෙනවා. හැබැයි පොඩියට තියෙන ආඩම්බරකම පාලනය කරගන්න එක වැදගත්.',
    traitsEn: ['Confident', 'Warm-hearted', 'Commanding', 'Creative'],
    traitsSi: ['නායකත්වය', 'කැපී පෙනෙනවා', 'ආකර්ෂණීයයි', 'නිර්භීතයි'],
    gem: { en: 'Ruby', si: 'මාණික්‍ය' },
    color: { en: 'Gold, Orange, Red', si: 'රන්, තැඹිලි, රතු' },
  },
  Kanya: {
    readingEn: 'Virgo Rising gives you a careful mind, practical judgement, and a strong eye for detail. You improve whatever you touch, but your peace grows when perfection becomes a guide rather than pressure.',
    readingSi: 'කන්‍යා ලග්නයෙන් ඉපදුණු ඔබ හරිම ප්‍රායෝගිකව, පිළිවෙළට වැඩ කරන කෙනෙක්. පුංචි පුංචි දේවල් ගැන පවා ඔබ ගොඩක් හිතනවා. සේවය කිරීම, සෞඛ්‍යය වගේ දේවල් ගැන ඔබ දක්වන උනන්දුව නිසා අනිත් අයට ඔබව ලොකු සහනයක් වෙනවා.',
    personalityEn: 'Your chart shows a refined problem-solver, someone who notices what others miss and turns small corrections into real progress.',
    personalitySi: 'ඕනෙම ප්‍රශ්නයක් ලේසියෙන් විසඳගන්න හැකියාව ඔබට තියෙනවා. හැමදේම පර්ෆෙක්ට් වෙන්න ඕනේ කියලා හිතලා ඔබ නිකන් ස්ට්‍රෙස් වෙන්න එපා.',
    traitsEn: ['Analytical', 'Practical', 'Organized', 'Helpful'],
    traitsSi: ['විශ්ලේෂණාත්මකයි', 'පිළිවෙළයි', 'සේවාකාමීයී', 'ප්‍රායෝගිකයි'],
    gem: { en: 'Emerald', si: 'මරකත' },
    color: { en: 'Green, Earth tones', si: 'කොළ, පස් වර්ණ' },
  },
  Tula: {
    readingEn: 'Libra Rising gives you charm, balance, and a strong sense of fairness. Relationships, beauty, negotiation, and social harmony become important life themes, and you succeed by choosing peace without losing your own voice.',
    readingSi: 'තුලා ලග්නයෙන් ඉපදුණු ඔබ සාමයට, සමානාත්මතාවයට මාරම ලැදියි. ප්‍රශ්නයක් වුණාම පැති දෙකම බලලා සාධාරණව තීරණ ගන්න ඔබට පුළුවන්. ලස්සන, කලාව වගේ දේවල් වලටත් ඔබ සහජයෙන් කැමතියි.',
    personalityEn: 'Your gift is reading both sides of a situation, but your growth comes from making clear choices when balance becomes delay.',
    personalitySi: 'වෙන අයත් එක්ක එකතුවෙලා වැඩ කරන්න තියෙන හැකියාව (Partnerships) තමයි ඔබේ ලොකුම ශක්තිය. තීරණ ගන්න ටිකක් පමා වුණත්, ගන්න තීරණය ගොඩක් වෙලාවට හරිම එක වෙනවා.',
    traitsEn: ['Diplomatic', 'Charming', 'Fair-minded', 'Artistic'],
    traitsSi: ['සාමකාමීයි', 'සාධාරණයි', 'කලාකාමීයි', 'සමබරයි'],
    gem: { en: 'Diamond', si: 'දියමන්ති' },
    color: { en: 'White, Pastel shades', si: 'සුදු, ලා වර්ණ' },
  },
  Vrischika: {
    readingEn: 'Scorpio Rising gives you an intense, private, and deeply observant nature. Mars adds courage under pressure, so you often transform through difficult moments and notice hidden motives before others do.',
    readingSi: 'වෘශ්චික ලග්නයෙන් ඉපදුණු ඔබට තියෙන්නේ ගැඹුරුම හැඟීම් දාමයක්. යමක් කරන්න හිතුවොත් ඒකෙ අගමුල හොයනකම්ම අතාරින්නේ නැහැ. ඔබේ මානසික ශක්තිය මාරම ප්‍රබලයි.',
    personalityEn: 'Your power is emotional depth with control, you are strongest when you use intensity for healing, research, and focused action.',
    personalitySi: 'අභියෝග වලට මුහුණ දීලා, අළු ගසලා නැගිටින එක ඔබට සහජයෙන්ම පිහිටලා තියෙනවා. අනිත් අයගේ හිතේ තියෙන දේ ඉක්මනින්ම තේරුම් ගන්න පුළුවන් එකත් ඔබේ විශේෂත්වයක්.',
    traitsEn: ['Intense willpower', 'Magnetic', 'Deep thinker', 'Resilient'],
    traitsSi: ['රහස්‍යයි', 'අධිෂ්ඨානශීලීයි', 'ගැඹුරුයි', 'මානසික ශක්තිය'],
    gem: { en: 'Red Coral', si: 'රතු පබළු' },
    color: { en: 'Deep Red, Maroon', si: 'තද රතු, මෙරූන්' },
  },
  Dhanus: {
    readingEn: 'Sagittarius Rising gives you optimism, faith, and a love of truth. You grow through learning, travel, teaching, and big ideas, especially when freedom is balanced with responsibility.',
    readingSi: 'ධනු ලග්නයෙන් ඉපදුණු ඔබ පට්ට නිදහස් කාමියෙක්. හැමදෙයක් දිහාම සුබවාදීව බලන ඔබ, සංචාරය කරන්න, අලුත් දේවල් ඉගෙනගන්න හරිම කැමතියි. ජීවිතේ යථාර්තය හොයන එක ඔබේ හැඩයක්.',
    personalityEn: 'Your chart points to a seeker, someone who needs meaning, movement, and a horizon to aim toward.',
    personalitySi: 'ඔබේ අවංකකම, කෙළින් කතා කරන ගතිය සමහර වෙලාවට අනිත් අයට රිදෙන්නත් පුළුවන්. හැබැයි ඔබ අනාගතය ගැන ගොඩක් දුර හිතලා තීරණ ගන්න කෙනෙක්.',
    traitsEn: ['Optimistic', 'Wise', 'Adventurous', 'Straightforward'],
    traitsSi: ['නිදහස්කාමීයි', 'සුබවාදීයි', 'අවංකයි', 'දර්ශනිකයි'],
    gem: { en: 'Yellow Sapphire', si: 'පුෂ්පරාග' },
    color: { en: 'Yellow, Gold', si: 'කහ, රන්' },
  },
  Makara: {
    readingEn: 'Capricorn Rising gives you patience, discipline, and a serious approach to achievement. Your success usually comes step by step, through structure, endurance, and practical decisions.',
    readingSi: 'මකර ලග්නයෙන් ඉපදුණු ඔබ කියන්නේ මාරම විනයක්, කැපවීමක් තියෙන කෙනෙක්. ජීවිතේ ලොකු ඉලක්ක තියාගෙන, ඒවාට හිමින් සැරේ, ස්ථාවරව ගමන් කරන එක තමයි ඔබේ ක්‍රමය. මහන්සි වෙලා වැඩ කරන්න ඔබට තියෙන්නේ ලොකු ශක්තියක්.',
    personalityEn: 'Your strength is long-term focus, you may start quietly but you can outlast people who move faster at the beginning.',
    personalitySi: 'වගකීම් අරගන්න බය නැති ඔබ, අමාරු කාලවලදීත් වැටෙන්නේ නැතුව ඉස්සරහට යනවා. පවුලේ අය වෙනුවෙනුත් ඔබ ලොකු වගකීමක් දරන කෙනෙක්.',
    traitsEn: ['Disciplined', 'Responsible', 'Patient', 'Strategic'],
    traitsSi: ['විනයගරුකයි', 'අරමුණු සහගතයි', 'වගකීම් දරනවා', 'කැපවෙනවා'],
    gem: { en: 'Blue Sapphire', si: 'නිල් මැණික්' },
    color: { en: 'Dark Blue, Black', si: 'තද නිල්, කළු' },
  },
  Kumbha: {
    readingEn: 'Aquarius Rising gives you originality, independence, and a mind that looks beyond the usual path. You are drawn to systems, communities, technology, and ideas that can improve life for many people.',
    readingSi: 'කුම්භ ලග්නයෙන් ඉපදුණු ඔබ හැමතිස්සෙම අලුත් විදිහට හිතන, අනාගතය දකින කෙනෙක්. සමාජයට, යහළුවන්ට ගොඩක් ළැදියි. සම්ප්‍රදායික රාමු වලින් පිටතට ගිහින් අලුත් දේවල් හොයන්න ඔබ හරිම දක්ෂයි.',
    personalityEn: 'Your personality carries distance and vision, you often understand where things are going before others are ready to accept it.',
    personalitySi: 'ඔබ අනිත් හැමෝටම සමානව සලකනවා. හැඟීම් වලට වඩා බුද්ධියට තැන දීලා වැඩ කරන නිසා, සමහර වෙලාවට ඔබ ටිකක් හුදෙකලා වෙලා ඉන්න හැදුවත්, ඇතුළින් ඔබ ගොඩක් මානුෂීයයි.',
    traitsEn: ['Original', 'Independent', 'Humanitarian', 'Forward-looking'],
    traitsSi: ['අලුත් විදිහට හිතනවා', 'මිත්‍රශීලීයි', 'මානුෂීයයි', 'ස්වාධීනයි'],
    gem: { en: 'Blue Sapphire', si: 'නිල් මැණික්' },
    color: { en: 'Electric Blue, Violet', si: 'දීප්තිමත් නිල්, දම්' },
  },
  Meena: {
    readingEn: 'Pisces Rising gives you compassion, imagination, and a deeply receptive heart. You absorb moods easily and do best when creativity, faith, and service have healthy boundaries.',
    readingSi: 'මීන ලග්නයෙන් ඉපදුණු ඔබ මාරම සංවේදී, අනිත් අය ගැන ගොඩක් දුක් වෙන කෙනෙක්. කලාත්මක හැකියාවන් සහ ගැඹුරු ආධ්‍යාත්මික ගතිගුණ ඔබට ජන්මයෙන්ම පිහිටලා තියෙනවා.',
    personalityEn: 'Your gift is emotional imagination, you can comfort, create, and understand what cannot always be explained in words.',
    personalitySi: 'අනිත් අයගේ ප්‍රශ්න වලදිත් ඔබට ගොඩක් දුක හිතෙනවා. හිතින් ලෝක මවන්න ඔබ දක්ෂයි වගේම, හැම වෙලේම අනිත් අයට උදව් කරන්න තමයි ඔබේ හිත කියන්නේ.',
    traitsEn: ['Compassionate', 'Imaginative', 'Intuitive', 'Gentle'],
    traitsSi: ['සංවේදීයි', 'පරිකල්පනය', 'ආධ්‍යාත්මිකයි', 'ත්‍යාගශීලීයි'],
    gem: { en: 'Yellow Sapphire', si: 'පුෂ්පරාග' },
    color: { en: 'Yellow, Sea Green', si: 'කහ, මුහුදු කොළ' },
  },
};

function getRashiKey(value) {
  if (!value) return null;
  var text = String(value).replace(/\s+Rising$/i, '').trim();
  return RASHI_LOOKUP[text] || RASHI_LOOKUP[text.toLowerCase()] || null;
}

function getLagnaUiCopy(chartData) {
  var lagna = chartData && chartData.lagna;
  var details = chartData && chartData.lagnaDetails;
  var candidates = [
    lagna && lagna.name,
    lagna && lagna.rashi,
    lagna && lagna.english,
    lagna && lagna.sinhala,
    details && details.english,
    details && details.sinhala,
  ];
  for (var i = 0; i < candidates.length; i += 1) {
    var key = getRashiKey(candidates[i]);
    if (key && LAGNA_UI_COPY[key]) return LAGNA_UI_COPY[key];
  }
  return null;
}

function stripSinhalaParenthetical(value) {
  if (!value) return '';
  return String(value).replace(/\s*\([^)]*[\u0D80-\u0DFF][^)]*\)/g, '').trim();
}

function extractSinhalaParenthetical(value) {
  if (!value) return '';
  var match = String(value).match(/\(([^)]*[\u0D80-\u0DFF][^)]*)\)/);
  return match ? match[1].trim() : '';
}

function localizedLagnaValue(copy, field, rawValue, language) {
  var local = copy && copy[field];
  if (language === 'si') return (local && local.si) || extractSinhalaParenthetical(rawValue) || rawValue || '';
  return (local && local.en) || stripSinhalaParenthetical(rawValue);
}

export {
  PLANET_NAMES_SI, RASHI_LOOKUP, LAGNA_UI_COPY,
  getRashiKey, getLagnaUiCopy,
  stripSinhalaParenthetical, extractSinhalaParenthetical, localizedLagnaValue,
};
