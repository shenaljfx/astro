/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GOCHARA (TRANSIT) ENGINE — Present & Near-Future Prediction System
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Maps real-time planetary transits against the natal chart to predict
 * what is happening NOW and what will happen in the coming days/weeks/months.
 *
 * Techniques implemented:
 *   1. Transit-to-natal house mapping (Gochara Phala)
 *   2. Vedha (obstruction) pairs — blocks transit effects
 *   3. Ashtakavarga transit scoring — quantified transit quality
 *   4. Dasha–transit integration — combined timing trigger
 *   5. Retrograde & combustion awareness
 *   6. Daily / Weekly / Monthly / Yearly forecast generators
 *   7. Planetary return analysis (Saturn return, Jupiter return)
 *
 * Based on: Phaladeepika, Brihat Samhita, Sarvartha Chintamani,
 *           KP Reader (transit techniques), Sri Lankan Gochara tradition
 *
 * Author: Grahachara Engine v4.0
 */

const {
  NAKSHATRAS, RASHIS, PLANETS, FUNCTIONAL_STATUS,
  getAllPlanetPositions, getLagna, buildHouseChart,
  toSidereal, getMoonLongitude, getSunLongitude, getAyanamsha,
  getNakshatra, getRashi, getPanchanga, getDailyNakath,
  calculateAshtakavarga, calculateVimshottariDetailed,
  getFunctionalNature, calculateSunriseSunset, dateToJD,
} = require('./astrology');


// ═══════════════════════════════════════════════════════════════════════════
//  VEDHA (OBSTRUCTION) PAIRS — Traditional Transit Blocks
// ═══════════════════════════════════════════════════════════════════════════
// If a benefic planet transits a good house but another planet is in the
// Vedha position, the good effect is obstructed.
// Format: { planet: { transitHouse: vedhaHouse } }

const VEDHA_TABLE = {
  'Sun':     { 1:5, 2:null, 3:9, 4:10, 5:4, 6:12, 7:1, 8:5, 9:11, 10:4, 11:3, 12:6 },
  'Moon':    { 1:5, 2:12, 3:9, 4:null, 5:null, 6:12, 7:2, 8:5, 9:11, 10:4, 11:3, 12:6 },
  'Mars':    { 1:5, 2:null, 3:12, 4:null, 5:null, 6:9, 7:1, 8:5, 9:null, 10:null, 11:12, 12:null },
  'Mercury': { 1:5, 2:4, 3:null, 4:3, 5:null, 6:12, 7:1, 8:10, 9:null, 10:8, 11:12, 12:null },
  'Jupiter': { 1:null, 2:3, 3:null, 4:10, 5:4, 6:null, 7:null, 8:null, 9:10, 10:9, 11:12, 12:null },
  'Venus':   { 1:8, 2:7, 3:1, 4:10, 5:9, 6:null, 7:2, 8:1, 9:11, 10:4, 11:6, 12:3 },
  'Saturn':  { 1:null, 2:null, 3:12, 4:null, 5:4, 6:null, 7:null, 8:null, 9:null, 10:null, 11:12, 12:3 },
};


// ═══════════════════════════════════════════════════════════════════════════
//  GOCHARA PHALA — Transit Effects of Each Planet Through 12 Houses
// ═══════════════════════════════════════════════════════════════════════════
// Each planet's transit from natal Moon sign (Chandra Lagna) produces
// specific results. These are from Phaladeepika & Sarvartha Chintamani.
// quality: 'good' | 'neutral' | 'bad'

const TRANSIT_EFFECTS = {
  'Sun': {
    1:  { quality: 'bad',     effect: 'Health strain, ego challenges, fatigue, expenses on travel', sinhala: 'සෞඛ්‍ය දුර්වලතා, අභිමාන ගැටලු' },
    2:  { quality: 'bad',     effect: 'Financial losses, speech problems, family tensions', sinhala: 'මූල්‍ය පාඩු, පවුල් ගැටලු' },
    3:  { quality: 'good',    effect: 'Victory over opponents, courage increases, good health, promotion', sinhala: 'සතුරන්ට ජයග්‍රහණය, ධෛර්ය වැඩිවීම' },
    4:  { quality: 'bad',     effect: 'Domestic unrest, vehicle trouble, mental anxiety, mother health', sinhala: 'ගෘහ අසාමාදානය, වාහන කරදර' },
    5:  { quality: 'bad',     effect: 'Children worries, romance blocks, speculation losses', sinhala: 'දරු කරදර, ප්‍රේම බාධා' },
    6:  { quality: 'good',    effect: 'Defeat of enemies, health improvement, debt clearance', sinhala: 'සතුරු පරාජය, සෞඛ්‍ය වැඩිදියුණු' },
    7:  { quality: 'bad',     effect: 'Travel fatigue, spouse disagreements, partnership strain', sinhala: 'ගමන් වෙහෙස, සහකරු ගැටලු' },
    8:  { quality: 'bad',     effect: 'Fever, government penalties, sudden obstacles', sinhala: 'උණ, රාජ දඬුවම්, හදිසි බාධා' },
    9:  { quality: 'bad',     effect: 'Obstacles in fortune, father health concern, spiritual blocks', sinhala: 'වාසනා බාධා, පිය සෞඛ්‍ය' },
    10: { quality: 'good',    effect: 'Career success, recognition, government favour, fame', sinhala: 'වෘත්තීය සාර්ථකත්වය, ප්‍රසිද්ධිය' },
    11: { quality: 'good',    effect: 'Financial gains, new position, fulfilment of desires', sinhala: 'මූල්‍ය ලාභ, අභිලාෂ ඉටුවීම' },
    12: { quality: 'bad',     effect: 'Eye trouble, expenditure, foreign travel, loss of position', sinhala: 'ඇස් කරදර, වියදම්, විදේශ ගමන්' },
  },
  'Moon': {
    1:  { quality: 'good',    effect: 'Comfort, good food, emotional well-being, social pleasures', sinhala: 'සුවපහසුව, සමාජ සැප' },
    2:  { quality: 'bad',     effect: 'Losses, disrepute, emotional disturbance', sinhala: 'අලාභ, අපකීර්තිය' },
    3:  { quality: 'good',    effect: 'Victory, friendship, happiness, new clothes', sinhala: 'ජයග්‍රහණය, මිත්‍රත්වය' },
    4:  { quality: 'bad',     effect: 'Fear, domestic anxiety, relatives trouble', sinhala: 'භීතිය, ගෘහ කනස්සැල්ල' },
    5:  { quality: 'bad',     effect: 'Mental depression, illness, obstacles', sinhala: 'මානසික අවපාතය, රෝග' },
    6:  { quality: 'good',    effect: 'Health, happiness, victory over enemies', sinhala: 'සෞඛ්‍ය, සතුරු පරාජය' },
    7:  { quality: 'good',    effect: 'Good food, honors, spouse affection, travel pleasure', sinhala: 'ගෞරව, සහකරු ප්‍රේමය' },
    8:  { quality: 'bad',     effect: 'Illness, mental worry, unexpected expenses', sinhala: 'රෝග, මානසික කනස්සැල්ල' },
    9:  { quality: 'bad',     effect: 'Imprisonment feeling, illness, mental restlessness', sinhala: 'බන්ධනාගාර හැඟීම, රෝග' },
    10: { quality: 'good',    effect: 'Success in work, fulfilment of plans, happiness', sinhala: 'වැඩ සාර්ථකත්වය, සතුට' },
    11: { quality: 'good',    effect: 'Gains of money, happiness, joyful events, new friends', sinhala: 'මුදල් ලාභ, ප්‍රීතිය' },
    12: { quality: 'bad',     effect: 'Expenditure, unhappiness, loss of comfort', sinhala: 'වියදම්, අසතුට' },
  },
  'Mars': {
    1:  { quality: 'bad',     effect: 'Fear of fire/theft, injuries, blood disorders, anger issues', sinhala: 'ගිනි/සොරකම් භය, තුවාල' },
    2:  { quality: 'bad',     effect: 'Loss of wealth, quarrels, eye problems, harsh speech', sinhala: 'ධන හානි, ඇස් ගැටලු' },
    3:  { quality: 'good',    effect: 'Wealth gain, victory, courage, new ventures succeed', sinhala: 'ධන ලාභ, ජයග්‍රහණය, ධෛර්ය' },
    4:  { quality: 'bad',     effect: 'Stomach ailments, domestic quarrels, vehicle accident risk', sinhala: 'උදර රෝග, ගෘහ ආරවුල්' },
    5:  { quality: 'bad',     effect: 'Enemies trouble, children illness, stomach disorders', sinhala: 'සතුරු කරදර, දරු රෝග' },
    6:  { quality: 'good',    effect: 'Victory over enemies, wealth gain, disease recovery', sinhala: 'සතුරු පරාජය, ධන ලාභ' },
    7:  { quality: 'bad',     effect: 'Spouse disagreements, eye problems, abdominal issues', sinhala: 'සහකරු ගැටලු, ඇස් රෝග' },
    8:  { quality: 'bad',     effect: 'Blood disorders, accidents, legal problems, sudden losses', sinhala: 'රුධිර රෝග, අනතුරු' },
    9:  { quality: 'bad',     effect: 'Waste of money, mental worry, physical strain', sinhala: 'මුදල් නාස්තිය, මානසික වෙහෙස' },
    10: { quality: 'bad',     effect: 'Career obstacles, loss of position, hard work without result', sinhala: 'වෘත්තීය බාධා, තනතුරු හානි' },
    11: { quality: 'good',    effect: 'Wealth gain, property acquisition, happiness, land purchase', sinhala: 'ධන ලාභ, දේපළ, සතුට' },
    12: { quality: 'bad',     effect: 'Eye diseases, expenditure, falls, burn risk', sinhala: 'ඇස් රෝග, වියදම්, වැටීම්' },
  },
  'Mercury': {
    1:  { quality: 'bad',     effect: 'Fear from enemies, loss of position, confusion', sinhala: 'සතුරු භය, තනතුරු හානි' },
    2:  { quality: 'good',    effect: 'Wealth through business, education success, good speech', sinhala: 'ව්‍යාපාර ධනය, අධ්‍යාපන සාර්ථකත්වය' },
    3:  { quality: 'bad',     effect: 'Quarrels, enemies arise, disputes', sinhala: 'ආරවුල්, සතුරු ඇතිවීම' },
    4:  { quality: 'good',    effect: 'Family happiness, friends support, vehicle gain, education', sinhala: 'පවුල් සතුට, මිතුරු සහාය' },
    5:  { quality: 'bad',     effect: 'Arguments with wife/children, business disputes', sinhala: 'බිරිඳ/දරුවන් සමඟ ආරවුල්' },
    6:  { quality: 'good',    effect: 'Victory in competitions, debate success, intellectual gains', sinhala: 'තරඟ ජය, බුද්ධිමය ලාභ' },
    7:  { quality: 'bad',     effect: 'Quarrels, eye diseases, loss of money', sinhala: 'ආරවුල්, ඇස් රෝග' },
    8:  { quality: 'good',    effect: 'Gains of wealth, success in ventures, good reputation', sinhala: 'ධන ලාභ, ව්‍යාපාර සාර්ථකත්වය' },
    9:  { quality: 'bad',     effect: 'Trouble, mental worry, failure in undertakings', sinhala: 'කරදර, මානසික වෙහෙස' },
    10: { quality: 'good',    effect: 'Happiness, learning success, income gains, intellectual recognition', sinhala: 'සතුට, ඉගෙනීම්, ආදායම්' },
    11: { quality: 'good',    effect: 'Wealth gain, friends, comforts, business success', sinhala: 'ධන ලාභ, මිතුරු, සැප' },
    12: { quality: 'bad',     effect: 'Quarrels, enmity, loss of reputation, expenditure', sinhala: 'ආරවුල්, අපකීර්තිය' },
  },
  'Jupiter': {
    1:  { quality: 'bad',     effect: 'Change of place, obstacles, expenditure, travel (though may learn)', sinhala: 'ස්ථාන වෙනසක්, බාධා, වියදම්' },
    2:  { quality: 'good',    effect: 'Wealth gain, family happiness, good food, speech improves', sinhala: 'ධන ලාභ, පවුල් සතුට' },
    3:  { quality: 'bad',     effect: 'Loss of position, displacement, obstacles', sinhala: 'තනතුරු හානි, බාධා' },
    4:  { quality: 'bad',     effect: 'Mental sorrow, relatives trouble, displacement from home', sinhala: 'මානසික දුක, නෑදෑ කරදර' },
    5:  { quality: 'good',    effect: 'Birth of children, wisdom, authority position, good fortune', sinhala: 'දරු උපත, ප්‍රඥාව, අධිකාරය' },
    6:  { quality: 'bad',     effect: 'Sorrow from enemies, trouble, ill health', sinhala: 'සතුරු දුක, කරදර' },
    7:  { quality: 'good',    effect: 'Happiness, marriage/partnership success, vehicle gain, comfort', sinhala: 'සතුට, විවාහ/හවුල් සාර්ථකත්වය' },
    8:  { quality: 'bad',     effect: 'Imprisonment feeling, hard work, loss of position, disease', sinhala: 'බන්ධනය, කම්කරුව' },
    9:  { quality: 'good',    effect: 'Great fortune, dharma, pilgrimage, higher learning, promotion', sinhala: 'මහා වාසනාව, ධර්මය, උසස් ඉගෙනීම' },
    10: { quality: 'bad',     effect: 'Loss of position, obstacles in career, hard work without result', sinhala: 'තනතුරු හානි, වෘත්තීය බාධා' },
    11: { quality: 'good',    effect: 'Wealth gain, vehicle, authority, all desires fulfilled', sinhala: 'ධන ලාභ, වාහන, අධිකාරය' },
    12: { quality: 'bad',     effect: 'Sorrow, expenditure, loss of position, failure', sinhala: 'දුක, වියදම්, අසාර්ථකත්වය' },
  },
  'Venus': {
    1:  { quality: 'good',    effect: 'All comforts, luxury, romance, beautiful things, enjoyment', sinhala: 'සියලු සැප, සුඛෝපභෝගය, ප්‍රේමය' },
    2:  { quality: 'good',    effect: 'Wealth gain, family happiness, good food, jewellery', sinhala: 'ධන ලාභ, පවුල් සතුට' },
    3:  { quality: 'good',    effect: 'Gains, happiness, good fortune, honours from authorities', sinhala: 'ලාභ, සතුට, ගෞරව' },
    4:  { quality: 'good',    effect: 'Friendship gains, vehicle, domestic happiness, mother well', sinhala: 'මිත්‍ර ලාභ, වාහන, ගෘහ සතුට' },
    5:  { quality: 'good',    effect: 'Authority, children happiness, romance flourishes, creativity', sinhala: 'අධිකාරය, දරු සතුට, ප්‍රේමය' },
    6:  { quality: 'bad',     effect: 'Enemies trouble, humiliation, expenses', sinhala: 'සතුරු කරදර, අපමානය' },
    7:  { quality: 'bad',     effect: 'Quarrels with spouse, partner disagreements, domestic issues', sinhala: 'සහකරු ගැටලු, ආරවුල්' },
    8:  { quality: 'good',    effect: 'Vehicle gain, good food, wealth from unexpected sources', sinhala: 'වාහන ලාභ, අනපේක්ෂිත ධනය' },
    9:  { quality: 'good',    effect: 'Fortune, dharma, pilgrimage, higher learning, happy events', sinhala: 'වාසනාව, ධර්මය, ශුභ සිදුවීම්' },
    10: { quality: 'bad',     effect: 'Quarrels, enmity, loss of position, embarrassment', sinhala: 'ආරවුල්, තනතුරු හානි' },
    11: { quality: 'good',    effect: 'Gains of all kinds, luxury, romance, fulfilment', sinhala: 'සියලු ලාභ, සුඛෝපභෝගය' },
    12: { quality: 'good',    effect: 'Bed pleasures, foreign comforts, luxury spending (enjoyed)', sinhala: 'ශය්‍යා සුඛ, විදේශ සැප' },
  },
  'Saturn': {
    1:  { quality: 'bad',     effect: 'Illness, displacement, loss of wealth, mental depression', sinhala: 'රෝග, ස්ථාන මාරුව, ධන හානි' },
    2:  { quality: 'bad',     effect: 'Loss of wealth, family trouble, bad food, harsh speech', sinhala: 'ධන හානි, පවුල් කරදර' },
    3:  { quality: 'good',    effect: 'Gains, servants, good health, victory, land acquisition', sinhala: 'ලාභ, සෞඛ්‍ය, ජයග්‍රහණය' },
    4:  { quality: 'bad',     effect: 'Domestic unhappiness, wife illness, loss of comfort', sinhala: 'ගෘහ අසතුට, බිරිඳ රෝග' },
    5:  { quality: 'bad',     effect: 'Children illness, loss of money, mind disturbed', sinhala: 'දරු රෝග, ධන හානි' },
    6:  { quality: 'good',    effect: 'Victory over enemies, gain of wealth, disease recovery', sinhala: 'සතුරු පරාජය, ධන ලාභ' },
    7:  { quality: 'bad',     effect: 'Travel fatigue, spouse health, body aches', sinhala: 'ගමන් වෙහෙස, සහකරු සෞඛ්‍ය' },
    8:  { quality: 'bad',     effect: 'Quarrels, disease, horse/vehicle trouble, legal issues', sinhala: 'ආරවුල්, රෝග, නීතිමය ගැටලු' },
    9:  { quality: 'bad',     effect: 'Loss of fortune, pointless work, father health concern', sinhala: 'වාසනා හානි, අනවශ්‍ය කම්' },
    10: { quality: 'bad',     effect: 'Loss of reputation, sinful deeds, career challenges', sinhala: 'කීර්තිය හානි, වෘත්තීය අභියෝග' },
    11: { quality: 'good',    effect: 'Wealth gain, happiness, fulfilment, property acquisition', sinhala: 'ධන ලාභ, සතුට, දේපළ' },
    12: { quality: 'bad',     effect: 'Expenditure, loss, enemies increase, imprisonment feeling', sinhala: 'වියදම්, හානි, සතුරු වැඩිවීම' },
  },
  'Rahu': {
    1:  { quality: 'bad',     effect: 'Health confusion, anxiety, identity crisis', sinhala: 'සෞඛ්‍ය ව්‍යාකූලතා, කාංසාව' },
    2:  { quality: 'bad',     effect: 'Financial deception, family secrets surface', sinhala: 'මූල්‍ය වංචා, පවුල් රහස්' },
    3:  { quality: 'good',    effect: 'Courage, adventurous gains, communication breakthrough', sinhala: 'ධෛර්ය, සාහසික ලාභ' },
    4:  { quality: 'bad',     effect: 'Domestic disruption, property disputes, mother worry', sinhala: 'ගෘහ කැළඹීම, දේපළ ආරවුල්' },
    5:  { quality: 'bad',     effect: 'Children worry, speculation loss, romance confusion', sinhala: 'දරු කනස්සැල්ල, මුදල් අලාභ' },
    6:  { quality: 'good',    effect: 'Destroy enemies unexpectedly, overcome obstacles', sinhala: 'සතුරු විනාශය, බාධා ජය' },
    7:  { quality: 'bad',     effect: 'Partnership problems, spouse misunderstanding', sinhala: 'හවුල් ගැටලු, සහකරු ගැටුම්' },
    8:  { quality: 'bad',     effect: 'Sudden crisis, hidden enemies, health scare', sinhala: 'හදිසි අර්බුදය, රහස් සතුරු' },
    9:  { quality: 'bad',     effect: 'Father concern, fortune blocked, dharma confusion', sinhala: 'පිය කනස්සැල්ල, වාසනා බාධා' },
    10: { quality: 'good',    effect: 'Sudden career rise, unconventional success, foreign opportunity', sinhala: 'හදිසි වෘත්තීය නැඟීම' },
    11: { quality: 'good',    effect: 'Unexpected gains, technology profits, network expansion', sinhala: 'අනපේක්ෂිත ලාභ, තාක්ෂණ ආදායම්' },
    12: { quality: 'bad',     effect: 'Foreign travel (forced), hidden expenses, spiritual confusion', sinhala: 'විදේශ ගමන්, සැඟවුණු වියදම්' },
  },
  'Ketu': {
    1:  { quality: 'bad',     effect: 'Health worry, spiritual crisis, body weakness', sinhala: 'සෞඛ්‍ය කනස්සැල්ල, ආධ්‍යාත්මික අර්බුදය' },
    2:  { quality: 'bad',     effect: 'Family separation, speech problems, financial uncertainty', sinhala: 'පවුල් වෙන්වීම, ආර්ථික අවිනිශ්චිතතාව' },
    3:  { quality: 'good',    effect: 'Spiritual courage, victory through detachment', sinhala: 'ආධ්‍යාත්මික ධෛර්ය, විරාගය මගින් ජය' },
    4:  { quality: 'bad',     effect: 'Domestic detachment, vehicle trouble, emotional emptiness', sinhala: 'ගෘහ විරාගය, වාහන කරදර' },
    5:  { quality: 'bad',     effect: 'Children concern, past-life karma surfaces, speculation loss', sinhala: 'දරු කනස්සැල්ල, පෙර කර්ම' },
    6:  { quality: 'good',    effect: 'Enemies destroyed, spiritual healing, disease overcome', sinhala: 'සතුරු විනාශය, ආධ්‍යාත්මික සුවය' },
    7:  { quality: 'bad',     effect: 'Partner detachment, spiritual seeking over worldly pleasure', sinhala: 'සහකරු විරාගය' },
    8:  { quality: 'bad',     effect: 'Sudden events, mysterious health, past-life triggers', sinhala: 'හදිසි සිදුවීම්, රහස්‍ය සෞඛ්‍ය' },
    9:  { quality: 'good',    effect: 'Spiritual pilgrimage, enlightenment, guru blessings', sinhala: 'ආධ්‍යාත්මික වන්දනා, ඥානය' },
    10: { quality: 'bad',     effect: 'Career confusion, sudden job changes, identity loss at work', sinhala: 'වෘත්තීය ව්‍යාකූලතා' },
    11: { quality: 'good',    effect: 'Spiritual gains, unexpected windfall, detached success', sinhala: 'ආධ්‍යාත්මික ලාභ, අනපේක්ෂිත වාසි' },
    12: { quality: 'good',    effect: 'Moksha (liberation) energy, spiritual retreat, meditation depth', sinhala: 'මෝක්ෂ ශක්තිය, ආධ්‍යාත්මික විවේකය' },
  },
};


// ═══════════════════════════════════════════════════════════════════════════
//  COMBUSTION DATA — Planets too close to the Sun lose strength
// ═══════════════════════════════════════════════════════════════════════════
const COMBUSTION_DEGREES = {
  'Moon':    12,  // within 12° of Sun
  'Mars':    17,
  'Mercury': 14,  // 12° direct, 14° retrograde — using wider for safety
  'Jupiter': 11,
  'Venus':   10,  // 8° direct, 10° retrograde
  'Saturn':  15,
};


// ═══════════════════════════════════════════════════════════════════════════
//  CORE: Get Current Transit Analysis
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Map transit planets against a natal chart
 * @param {Date} transitDate - date to compute transits for (default: now)
 * @param {Date} birthDate - natal birth date/time
 * @param {number} lat - birth latitude
 * @param {number} lng - birth longitude
 * @returns {Object} full transit analysis
 */
function getCurrentTransits(transitDate, birthDate, lat = 6.9271, lng = 79.8612) {
  const tDate = transitDate ? new Date(transitDate) : new Date();
  const bDate = new Date(birthDate);

  // Natal data
  const natalChart = buildHouseChart(bDate, lat, lng);
  const natalPlanets = getAllPlanetPositions(bDate);
  const natalMoonSid = toSidereal(getMoonLongitude(bDate), bDate);
  const natalMoonRashiId = Math.floor(natalMoonSid / 30) + 1;
  const natalLagnaRashiId = natalChart.lagna?.rashi?.id || natalChart.houses[0]?.rashiId || 1;
  const lagnaName = natalChart.lagna?.rashi?.name || RASHIS[natalLagnaRashiId - 1]?.name || 'Mesha';

  // Transit data
  const transitPlanets = getAllPlanetPositions(tDate);

  // Ashtakavarga (pre-computed from natal)
  let ashtakavarga = null;
  try { ashtakavarga = calculateAshtakavarga(bDate, lat, lng); } catch (e) { /* optional */ }

  // Current Dasha
  const moonSidereal = toSidereal(getMoonLongitude(bDate), bDate);
  let currentDasha = null;
  let currentAD = null;
  try {
    const dashas = calculateVimshottariDetailed(moonSidereal, bDate);
    const now = tDate.getTime();
    for (const md of dashas) {
      const mdStart = new Date(md.start).getTime();
      const mdEnd = new Date(md.endDate).getTime();
      if (now >= mdStart && now <= mdEnd) {
        currentDasha = md;
        for (const ad of (md.antardashas || [])) {
          const adStart = new Date(ad.start).getTime();
          const adEnd = new Date(ad.endDate).getTime();
          if (now >= adStart && now <= adEnd) { currentAD = ad; break; }
        }
        break;
      }
    }
  } catch (e) { /* optional */ }

  // Build transit results per planet
  const results = {};
  const sunSidereal = transitPlanets.sun.sidereal;

  const PLANET_KEYS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];

  for (const key of PLANET_KEYS) {
    const tp = transitPlanets[key];
    const np = natalPlanets[key];
    const pName = tp.name;

    // House from natal Moon (Gochara house)
    const houseFromMoon = ((tp.rashiId - natalMoonRashiId + 12) % 12) + 1;
    // House from natal Lagna
    const houseFromLagna = ((tp.rashiId - natalLagnaRashiId + 12) % 12) + 1;

    // Transit effect (from Moon — traditional Gochara)
    const effect = TRANSIT_EFFECTS[pName]?.[houseFromMoon] || { quality: 'neutral', effect: 'Mixed results', sinhala: '' };

    // Vedha check
    let vedhaBlocked = false;
    let vedhaBlocker = null;
    const vedhaHouse = VEDHA_TABLE[pName]?.[houseFromMoon];
    if (vedhaHouse) {
      // Check if any OTHER transit planet is in the vedha house from Moon
      for (const otherKey of PLANET_KEYS) {
        if (otherKey === key) continue;
        const otherP = transitPlanets[otherKey];
        const otherHouseFromMoon = ((otherP.rashiId - natalMoonRashiId + 12) % 12) + 1;
        if (otherHouseFromMoon === vedhaHouse) {
          vedhaBlocked = true;
          vedhaBlocker = otherP.name;
          break;
        }
      }
    }

    // Combustion check (only for planets, not Sun/Rahu/Ketu)
    let isCombust = false;
    const combDeg = COMBUSTION_DEGREES[pName];
    if (combDeg) {
      const diff = Math.abs(tp.sidereal - sunSidereal);
      const angDist = Math.min(diff, 360 - diff);
      if (angDist <= combDeg) isCombust = true;
    }

    // SAV score of the transit sign (how many benefic points this sign has)
    let savScore = null;
    let bavScore = null;
    if (ashtakavarga) {
      savScore = ashtakavarga.sarvashtakavarga?.[tp.rashiId] || null;
      // BAV: individual planet score in transit sign
      const bavTable = ashtakavarga.prastarashtakavarga?.[pName];
      if (bavTable) { bavScore = bavTable[tp.rashiId] || null; }
    }

    // Functional nature for this Lagna
    const funcNature = getFunctionalNature(lagnaName, pName);

    // Nakshatra of transit planet
    const transitNakIdx = Math.floor(tp.sidereal / (360 / 27));
    const transitNak = NAKSHATRAS[transitNakIdx] || {};

    // Is planet transiting over a natal planet? (conjunction within 10°)
    let conjunctsNatal = null;
    for (const nKey of PLANET_KEYS) {
      const nP = natalPlanets[nKey];
      const diff = Math.abs(tp.sidereal - nP.sidereal);
      const angDist = Math.min(diff, 360 - diff);
      if (angDist <= 10 && nKey !== key) {
        conjunctsNatal = { planet: nP.name, distance: angDist.toFixed(1) };
        break;
      }
    }

    results[key] = {
      planet: pName,
      sinhala: tp.sinhala,
      transitRashi: tp.rashiEnglish,
      transitRashiId: tp.rashiId,
      transitDegree: tp.sidereal.toFixed(2),
      transitNakshatra: transitNak.name,
      isRetrograde: tp.isRetrograde || false,
      isCombust,
      houseFromMoon,
      houseFromLagna,
      natalHouse: natalChart.houses.findIndex(h => h.planets.some(p => p.name === pName)) + 1 || null,
      effect: vedhaBlocked
        ? { quality: 'blocked', effect: `Transit effect blocked by ${vedhaBlocker} (Vedha)`, sinhala: `${vedhaBlocker} මගින් අවහිරය` }
        : effect,
      vedhaBlocked,
      vedhaBlocker,
      savScore,
      bavScore,
      savQuality: savScore !== null ? (savScore >= 30 ? 'Excellent' : savScore >= 26 ? 'Good' : savScore >= 22 ? 'Average' : 'Weak') : null,
      functionalNature: funcNature,
      conjunctsNatal,
      retroNote: tp.isRetrograde ? `${pName} retrograde — delays and re-evaluation in ${pName} matters` : null,
      combustNote: isCombust ? `${pName} combust (too close to Sun) — weakened expression of ${pName} significations` : null,
    };
  }

  // Dasha-Transit synergy
  let dashaSynergy = null;
  if (currentDasha && currentAD) {
    const mdLord = currentDasha.lord;
    const adLord = currentAD.lord;
    const mdTransit = results[mdLord.toLowerCase()];
    const adTransit = results[adLord.toLowerCase()];

    const synergies = [];
    if (mdTransit && mdTransit.effect.quality === 'good') {
      synergies.push(`${mdLord} (current main period lord) transiting house ${mdTransit.houseFromMoon} from Moon — ${mdTransit.effect.quality} effect amplifies dasha results`);
    }
    if (adTransit && adTransit.effect.quality === 'good') {
      synergies.push(`${adLord} (current sub-period lord) transiting favourably — event activation likely`);
    }
    // Check if Jupiter or Saturn aspect the dasha lord's natal position
    const jupTransitH = results.jupiter?.houseFromLagna;
    const satTransitH = results.saturn?.houseFromLagna;
    const mdNatalH = results[mdLord.toLowerCase()]?.natalHouse;
    if (mdNatalH && jupTransitH) {
      const jupAspects = [5, 7, 9];
      for (const asp of jupAspects) {
        if (((jupTransitH - 1 + asp) % 12) + 1 === mdNatalH) {
          synergies.push(`Jupiter aspects natal ${mdLord} — powerful activation of current period`);
          break;
        }
      }
    }

    dashaSynergy = {
      currentDasha: `${mdLord} Mahadasha → ${adLord} Antardasha`,
      dashaStart: currentDasha.start,
      dashaEnd: currentDasha.endDate,
      adStart: currentAD.start,
      adEnd: currentAD.endDate,
      synergies,
      overallTone: synergies.length >= 2 ? 'Very Active — events manifest now'
        : synergies.length >= 1 ? 'Active — positive developments unfolding'
        : 'Steady — results come through effort',
    };
  }

  // Double Transit check (Jupiter + Saturn both influencing a house)
  const doubleTransits = [];
  for (let h = 1; h <= 12; h++) {
    const jupH = results.jupiter?.houseFromLagna;
    const satH = results.saturn?.houseFromLagna;
    const jupTouches = jupH === h || [5, 7, 9].some(a => ((jupH - 1 + a) % 12) + 1 === h);
    const satTouches = satH === h || [3, 7, 10].some(a => ((satH - 1 + a) % 12) + 1 === h);
    if (jupTouches && satTouches) {
      const houseSignif = getHouseSignification(h);
      doubleTransits.push({
        house: h,
        signification: houseSignif,
        note: `Double Transit on house ${h} — events related to ${houseSignif} are likely to manifest during this period`,
      });
    }
  }

  // Overall transit quality score
  const goodCount = Object.values(results).filter(r => r.effect.quality === 'good').length;
  const badCount = Object.values(results).filter(r => r.effect.quality === 'bad').length;
  const overallQuality = goodCount >= 6 ? 'Excellent' : goodCount >= 4 ? 'Good' : goodCount >= 3 ? 'Average' : badCount >= 6 ? 'Difficult' : 'Challenging';

  return {
    transitDate: tDate.toISOString(),
    natalData: {
      lagnaSign: lagnaName,
      moonSign: RASHIS[natalMoonRashiId - 1]?.english || '',
      lagnaRashiId: natalLagnaRashiId,
      moonRashiId: natalMoonRashiId,
    },
    planets: results,
    dashaSynergy,
    doubleTransits,
    overallQuality,
    summary: {
      goodTransits: goodCount,
      badTransits: badCount,
      blockedByVedha: Object.values(results).filter(r => r.vedhaBlocked).length,
      combustPlanets: Object.values(results).filter(r => r.isCombust).length,
      retrogradePlanets: Object.values(results).filter(r => r.isRetrograde).length,
    },
  };
}


// ═══════════════════════════════════════════════════════════════════════════
//  DAILY FORECAST
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a daily forecast combining Panchanga + Moon transit + dasha
 */
function getDailyForecast(date, birthDate, lat = 6.9271, lng = 79.8612) {
  const tDate = date ? new Date(date) : new Date();
  const bDate = new Date(birthDate);

  const transits = getCurrentTransits(tDate, bDate, lat, lng);
  const panchanga = getPanchanga(tDate, lat, lng);
  let dailyNakath = null;
  try { dailyNakath = getDailyNakath(tDate, lat, lng); } catch (e) { /* ok */ }

  // Moon transit is the primary daily influence
  const moonTransit = transits.planets.moon;

  // Which natal Nakshatras are activated by transit Moon?
  const natalMoonNakIdx = Math.floor(toSidereal(getMoonLongitude(bDate), bDate) / (360 / 27));
  const transitMoonNakIdx = Math.floor(toSidereal(getMoonLongitude(tDate), tDate) / (360 / 27));

  // Tarabala — count from natal Nakshatra to transit Nakshatra
  const tarabalaNum = ((transitMoonNakIdx - natalMoonNakIdx + 27) % 27) + 1;
  const TARABALA_NAMES = ['Janma', 'Sampat', 'Vipat', 'Kshema', 'Pratyari', 'Sadhaka', 'Vadha', 'Mitra', 'Ati-Mitra'];
  const tarabalaIdx = ((tarabalaNum - 1) % 9);
  const tarabalaName = TARABALA_NAMES[tarabalaIdx];
  const TARABALA_QUALITY = ['bad', 'good', 'bad', 'good', 'bad', 'good', 'bad', 'good', 'good'];
  const tarabalaQuality = TARABALA_QUALITY[tarabalaIdx];

  // Chandrabala — Moon's house position from natal Moon
  const chandrabalaH = moonTransit.houseFromMoon;
  const CHANDRABALA_GOOD = [1, 3, 6, 7, 10, 11];
  const chandrabalaGood = CHANDRABALA_GOOD.includes(chandrabalaH);

  // Daily quality score
  let dailyScore = 50;
  if (moonTransit.effect.quality === 'good') dailyScore += 15;
  if (moonTransit.effect.quality === 'bad') dailyScore -= 10;
  if (tarabalaQuality === 'good') dailyScore += 15;
  if (tarabalaQuality === 'bad') dailyScore -= 10;
  if (chandrabalaGood) dailyScore += 10;
  else dailyScore -= 5;
  // Panchanga quality
  if (panchanga.tithi?.paksha === 'Shukla') dailyScore += 5;  // waxing moon generally better
  dailyScore = Math.max(0, Math.min(100, dailyScore));

  const dayQuality = dailyScore >= 75 ? 'Excellent' : dailyScore >= 60 ? 'Good' : dailyScore >= 45 ? 'Average' : dailyScore >= 30 ? 'Challenging' : 'Difficult';

  return {
    date: tDate.toISOString().split('T')[0],
    dayOfWeek: RASHIS.length > 0 ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][tDate.getDay()] : '',
    panchanga: {
      tithi: panchanga.tithi?.name,
      nakshatra: panchanga.nakshatra?.name,
      yoga: panchanga.yoga?.name,
      karana: panchanga.karana?.name,
    },
    moonTransit: {
      sign: moonTransit.transitRashi,
      houseFromMoon: moonTransit.houseFromMoon,
      houseFromLagna: moonTransit.houseFromLagna,
      effect: moonTransit.effect.effect,
      quality: moonTransit.effect.quality,
    },
    tarabala: {
      name: tarabalaName,
      number: tarabalaNum,
      quality: tarabalaQuality,
      note: tarabalaQuality === 'good' ? `${tarabalaName} Tara — favourable day for new actions` : `${tarabalaName} Tara — exercise caution today`,
    },
    chandrabala: {
      house: chandrabalaH,
      quality: chandrabalaGood ? 'good' : 'bad',
      note: chandrabalaGood ? `Moon in house ${chandrabalaH} from natal Moon — emotionally positive` : `Moon in house ${chandrabalaH} from natal Moon — emotional caution needed`,
    },
    rahuKalaya: dailyNakath?.rahuKalaya || null,
    sunrise: dailyNakath?.sunrise || null,
    sunset: dailyNakath?.sunset || null,
    dailyScore,
    dayQuality,
    currentDasha: transits.dashaSynergy?.currentDasha || null,
    advice: generateDailyAdvice(dayQuality, moonTransit, tarabalaName, tarabalaQuality),
  };
}

function generateDailyAdvice(quality, moonTransit, tarabala, tarabalaQuality) {
  const advice = [];
  if (quality === 'Excellent' || quality === 'Good') {
    advice.push('Good day for important decisions and new beginnings');
    advice.push('Social interactions are favoured');
  } else if (quality === 'Average') {
    advice.push('Routine work is fine — avoid major commitments');
    advice.push('Focus on completing existing tasks');
  } else {
    advice.push('Caution advised — avoid starting new ventures');
    advice.push('Focus on self-care and inner reflection');
  }
  if (tarabalaQuality === 'bad' && tarabala === 'Vadha') {
    advice.push('Vadha Tara active — avoid travel and risky activities');
  }
  if (moonTransit.effect.quality === 'good') {
    advice.push('Moon transit supports emotional well-being today');
  }
  return advice;
}


// ═══════════════════════════════════════════════════════════════════════════
//  WEEKLY FORECAST
// ═══════════════════════════════════════════════════════════════════════════

function getWeeklyForecast(startDate, birthDate, lat = 6.9271, lng = 79.8612) {
  const start = startDate ? new Date(startDate) : new Date();
  const days = [];
  let bestDay = null;
  let worstDay = null;
  let totalScore = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const forecast = getDailyForecast(d, birthDate, lat, lng);
    days.push(forecast);
    totalScore += forecast.dailyScore;
    if (!bestDay || forecast.dailyScore > bestDay.dailyScore) bestDay = forecast;
    if (!worstDay || forecast.dailyScore < worstDay.dailyScore) worstDay = forecast;
  }

  const avgScore = Math.round(totalScore / 7);
  const weekQuality = avgScore >= 65 ? 'Good Week' : avgScore >= 45 ? 'Average Week' : 'Challenging Week';

  return {
    weekStarting: start.toISOString().split('T')[0],
    days,
    bestDay: { date: bestDay.date, score: bestDay.dailyScore, quality: bestDay.dayQuality },
    worstDay: { date: worstDay.date, score: worstDay.dailyScore, quality: worstDay.dayQuality },
    averageScore: avgScore,
    weekQuality,
    weeklyTheme: getWeeklyTheme(days),
  };
}

function getWeeklyTheme(days) {
  const goodDays = days.filter(d => d.dailyScore >= 60).length;
  if (goodDays >= 5) return 'A strongly positive week — take initiative on important matters';
  if (goodDays >= 3) return 'A mixed week with more good days — plan key activities for the best days';
  return 'A week that requires patience — focus on inner work and routine tasks';
}


// ═══════════════════════════════════════════════════════════════════════════
//  MONTHLY FORECAST
// ═══════════════════════════════════════════════════════════════════════════

function getMonthlyForecast(month, year, birthDate, lat = 6.9271, lng = 79.8612) {
  const bDate = new Date(birthDate);
  const m = month || new Date().getMonth() + 1;
  const y = year || new Date().getFullYear();

  // Get transit snapshot for mid-month
  const midMonth = new Date(Date.UTC(y, m - 1, 15));
  const transits = getCurrentTransits(midMonth, bDate, lat, lng);

  // Slow planet analysis (Jupiter, Saturn, Rahu/Ketu — define the month's theme)
  const jupiter = transits.planets.jupiter;
  const saturn = transits.planets.saturn;
  const rahu = transits.planets.rahu;

  // Sun transit (defines the month's solar theme)
  const sun = transits.planets.sun;

  // Mars, Venus, Mercury — medium-speed planets
  const mars = transits.planets.mars;
  const venus = transits.planets.venus;
  const mercury = transits.planets.mercury;

  // Build monthly themes
  const themes = [];

  // Jupiter theme
  if (jupiter.effect.quality === 'good') {
    themes.push({ planet: 'Jupiter', area: getHouseArea(jupiter.houseFromLagna), tone: 'positive', detail: jupiter.effect.effect });
  } else {
    themes.push({ planet: 'Jupiter', area: getHouseArea(jupiter.houseFromLagna), tone: 'challenging', detail: jupiter.effect.effect });
  }

  // Saturn theme
  if (saturn.effect.quality === 'good') {
    themes.push({ planet: 'Saturn', area: getHouseArea(saturn.houseFromLagna), tone: 'positive', detail: saturn.effect.effect });
  } else {
    themes.push({ planet: 'Saturn', area: getHouseArea(saturn.houseFromLagna), tone: 'growth through challenge', detail: saturn.effect.effect });
  }

  // Double transits
  const activeDoubleTransits = transits.doubleTransits || [];

  // Find best week of the month (sample 4 weeks)
  let bestWeekStart = null;
  let bestWeekScore = -1;
  for (let w = 0; w < 4; w++) {
    const weekStart = new Date(Date.UTC(y, m - 1, 1 + w * 7));
    if (weekStart.getMonth() !== m - 1) break;
    let weekScore = 0;
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + d);
      if (day.getMonth() !== m - 1) break;
      try {
        const df = getDailyForecast(day, birthDate, lat, lng);
        weekScore += df.dailyScore;
      } catch (e) { weekScore += 50; }
    }
    if (weekScore > bestWeekScore) {
      bestWeekScore = weekScore;
      bestWeekStart = weekStart.toISOString().split('T')[0];
    }
  }

  // Monthly score
  const positiveTransits = Object.values(transits.planets).filter(p => p.effect.quality === 'good').length;
  const monthScore = Math.round((positiveTransits / 9) * 100);
  const monthQuality = monthScore >= 60 ? 'Favourable Month' : monthScore >= 40 ? 'Average Month' : 'Challenging Month';

  return {
    month: m,
    year: y,
    monthName: ['January','February','March','April','May','June','July','August','September','October','November','December'][m - 1],
    transits: {
      jupiter: { sign: jupiter.transitRashi, house: jupiter.houseFromLagna, quality: jupiter.effect.quality },
      saturn: { sign: saturn.transitRashi, house: saturn.houseFromLagna, quality: saturn.effect.quality },
      rahu: { sign: rahu.transitRashi, house: rahu.houseFromLagna },
      mars: { sign: mars.transitRashi, house: mars.houseFromLagna, quality: mars.effect.quality },
      venus: { sign: venus.transitRashi, house: venus.houseFromLagna, quality: venus.effect.quality },
      mercury: { sign: mercury.transitRashi, house: mercury.houseFromLagna, quality: mercury.effect.quality },
      sun: { sign: sun.transitRashi, house: sun.houseFromLagna, quality: sun.effect.quality },
    },
    themes,
    doubleTransits: activeDoubleTransits,
    currentDasha: transits.dashaSynergy?.currentDasha || null,
    dashaSynergy: transits.dashaSynergy?.synergies || [],
    bestWeek: bestWeekStart,
    monthScore,
    monthQuality,
    careerOutlook: generateAreaOutlook(transits, [10, 6, 2]),
    financeOutlook: generateAreaOutlook(transits, [2, 11, 5]),
    healthOutlook: generateAreaOutlook(transits, [1, 6, 8]),
    relationshipOutlook: generateAreaOutlook(transits, [7, 5, 4]),
  };
}

function generateAreaOutlook(transits, houses) {
  let goodCount = 0;
  let total = 0;
  for (const r of Object.values(transits.planets)) {
    if (houses.includes(r.houseFromLagna)) {
      total++;
      if (r.effect.quality === 'good') goodCount++;
    }
  }
  if (total === 0) return 'Neutral';
  const ratio = goodCount / total;
  if (ratio >= 0.6) return 'Positive';
  if (ratio >= 0.3) return 'Mixed';
  return 'Needs Attention';
}


// ═══════════════════════════════════════════════════════════════════════════
//  YEARLY FORECAST
// ═══════════════════════════════════════════════════════════════════════════

function getYearlyForecast(year, birthDate, lat = 6.9271, lng = 79.8612) {
  const y = year || new Date().getFullYear();
  const bDate = new Date(birthDate);

  const monthlySnapshots = [];
  for (let m = 1; m <= 12; m++) {
    try {
      const monthly = getMonthlyForecast(m, y, birthDate, lat, lng);
      monthlySnapshots.push({
        month: m,
        monthName: monthly.monthName,
        score: monthly.monthScore,
        quality: monthly.monthQuality,
        careerOutlook: monthly.careerOutlook,
        financeOutlook: monthly.financeOutlook,
        healthOutlook: monthly.healthOutlook,
        relationshipOutlook: monthly.relationshipOutlook,
        jupiterHouse: monthly.transits.jupiter.house,
        saturnHouse: monthly.transits.saturn.house,
      });
    } catch (e) {
      monthlySnapshots.push({ month: m, score: 50, quality: 'N/A' });
    }
  }

  const bestMonth = monthlySnapshots.reduce((a, b) => a.score > b.score ? a : b, { score: -1 });
  const worstMonth = monthlySnapshots.reduce((a, b) => a.score < b.score ? a : b, { score: 101 });
  const avgScore = Math.round(monthlySnapshots.reduce((s, m) => s + m.score, 0) / 12);

  // Jupiter and Saturn sign changes during the year (major events)
  const signChanges = detectSignChanges(y, bDate, lat, lng);

  // Saturn Return check
  const saturnReturn = checkPlanetaryReturn('saturn', bDate, y);
  const jupiterReturn = checkPlanetaryReturn('jupiter', bDate, y);

  return {
    year: y,
    yearQuality: avgScore >= 60 ? 'Prosperous Year' : avgScore >= 40 ? 'Growth Year' : 'Transformative Year',
    averageScore: avgScore,
    months: monthlySnapshots,
    bestMonth: { month: bestMonth.monthName, score: bestMonth.score },
    worstMonth: { month: worstMonth.monthName, score: worstMonth.score },
    majorTransits: signChanges,
    saturnReturn,
    jupiterReturn,
    yearlyThemes: generateYearlyThemes(monthlySnapshots, signChanges),
  };
}

function detectSignChanges(year, birthDate, lat, lng) {
  const changes = [];
  const bDate = new Date(birthDate);
  const natalLagnaRashiId = (() => {
    try {
      const nc = buildHouseChart(bDate, lat, lng);
      return nc.lagna?.rashi?.id || nc.houses[0]?.rashiId || 1;
    } catch (e) { return 1; }
  })();

  const slowPlanets = ['jupiter', 'saturn', 'rahu'];
  for (const pKey of slowPlanets) {
    let prevSign = null;
    for (let m = 1; m <= 12; m++) {
      const d = new Date(Date.UTC(year, m - 1, 15));
      try {
        const planets = getAllPlanetPositions(d);
        const curSign = planets[pKey].rashiId;
        if (prevSign && curSign !== prevSign) {
          const houseFromLagna = ((curSign - natalLagnaRashiId + 12) % 12) + 1;
          changes.push({
            planet: planets[pKey].name,
            fromSign: RASHIS[prevSign - 1]?.english,
            toSign: RASHIS[curSign - 1]?.english,
            approximateMonth: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1],
            newHouseFromLagna: houseFromLagna,
            significance: `${planets[pKey].name} enters your ${ordinal(houseFromLagna)} house — ${getHouseArea(houseFromLagna)} matters will shift`,
          });
        }
        prevSign = curSign;
      } catch (e) { /* skip */ }
    }
  }
  return changes;
}

function checkPlanetaryReturn(planetKey, birthDate, year) {
  const bDate = new Date(birthDate);
  const natalPlanets = getAllPlanetPositions(bDate);
  const natalRashiId = natalPlanets[planetKey]?.rashiId;
  if (!natalRashiId) return null;

  for (let m = 1; m <= 12; m++) {
    const d = new Date(Date.UTC(year, m - 1, 15));
    try {
      const tp = getAllPlanetPositions(d);
      if (tp[planetKey]?.rashiId === natalRashiId) {
        const age = year - bDate.getUTCFullYear();
        const pName = tp[planetKey].name;
        return {
          planet: pName,
          returnYear: year,
          approximateAge: age,
          inSign: RASHIS[natalRashiId - 1]?.english,
          isActive: true,
          significance: pName === 'Saturn'
            ? `Saturn Return (age ~${age}) — major life restructuring, career/responsibility shifts, maturity milestone`
            : `Jupiter Return (age ~${age}) — expansion, wisdom cycle, growth in fortune and beliefs`,
        };
      }
    } catch (e) { /* skip */ }
  }
  return null;
}

function generateYearlyThemes(months, signChanges) {
  const themes = [];
  const goodMonths = months.filter(m => m.score >= 55).length;
  if (goodMonths >= 8) themes.push('Overall excellent year — capitalize on opportunities');
  else if (goodMonths >= 5) themes.push('A balanced year — peaks and valleys to navigate wisely');
  else themes.push('A year of transformation — challenges bring long-term growth');

  if (signChanges.length > 0) {
    themes.push(`Major planetary shifts this year: ${signChanges.map(c => c.planet).join(', ')} change signs — expect significant life changes`);
  }
  return themes;
}


// ═══════════════════════════════════════════════════════════════════════════
//  RETROGRADE PERIODS
// ═══════════════════════════════════════════════════════════════════════════

function getRetrogradePeriods(year) {
  const y = year || new Date().getFullYear();
  const retrogrades = [];
  const planets = ['mars', 'mercury', 'jupiter', 'venus', 'saturn'];

  for (const pKey of planets) {
    let wasRetro = false;
    let retroStart = null;

    for (let d = 0; d < 365; d++) {
      const date = new Date(Date.UTC(y, 0, 1 + d));
      if (date.getUTCFullYear() !== y) break;
      try {
        const positions = getAllPlanetPositions(date);
        const isRetro = positions[pKey]?.isRetrograde || false;
        if (isRetro && !wasRetro) {
          retroStart = date.toISOString().split('T')[0];
        }
        if (!isRetro && wasRetro && retroStart) {
          retrogrades.push({
            planet: positions[pKey]?.name || pKey,
            start: retroStart,
            end: date.toISOString().split('T')[0],
            sign: positions[pKey]?.rashiEnglish || '',
            advice: getRetrogradeAdvice(pKey),
          });
          retroStart = null;
        }
        wasRetro = isRetro;
      } catch (e) { /* skip */ }
    }
    // If still retro at year end
    if (wasRetro && retroStart) {
      retrogrades.push({
        planet: pKey, start: retroStart, end: `${y}-12-31`,
        sign: '', advice: getRetrogradeAdvice(pKey),
      });
    }
  }
  return retrogrades;
}

function getRetrogradeAdvice(planetKey) {
  const advice = {
    mercury: 'Communication delays, tech issues, travel disruptions. Review contracts before signing. Reconnect with old contacts.',
    venus: 'Re-evaluate relationships, avoid major beauty purchases, old flames may return. Good for inner reflection on love values.',
    mars: 'Energy slows, avoid confrontation, physical risk increases. Redirect aggression into planned work. Avoid surgery if possible.',
    jupiter: 'Internal wisdom growth, re-evaluate beliefs and education goals. Spiritual deepening. Avoid risky expansion.',
    saturn: 'Karmic review period, old responsibilities resurface. Restructure existing commitments. Discipline brings rewards.',
  };
  return advice[planetKey] || 'Review and reassess matters related to this planet.';
}


// ═══════════════════════════════════════════════════════════════════════════
//  HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getHouseSignification(house) {
  const sigs = {
    1: 'Self, health, personality',
    2: 'Wealth, family, speech',
    3: 'Siblings, courage, communication',
    4: 'Home, mother, vehicles, education',
    5: 'Children, creativity, romance',
    6: 'Enemies, disease, service',
    7: 'Marriage, partnerships, business',
    8: 'Longevity, transformation, sudden events',
    9: 'Fortune, father, dharma, travel',
    10: 'Career, profession, public status',
    11: 'Gains, income, aspirations',
    12: 'Expenses, foreign, spirituality',
  };
  return sigs[house] || '';
}

function getHouseArea(house) {
  const areas = {
    1: 'self & health', 2: 'finances & family', 3: 'communication & courage',
    4: 'home & happiness', 5: 'creativity & children', 6: 'health & service',
    7: 'relationships & partnerships', 8: 'transformation', 9: 'fortune & wisdom',
    10: 'career & status', 11: 'gains & aspirations', 12: 'expenses & spirituality',
  };
  return areas[house] || 'general';
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}


// ═══════════════════════════════════════════════════════════════════════════
//  KAKSHYA (SUB-DIVISIONAL) TRANSIT ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════
// Each sign is divided into 8 Kakshyas of 3°45' each.
// The Kakshya lord determines the quality of transit within that portion.

const KAKSHYA_LORDS = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon', 'Lagna'];
const KAKSHYA_SPAN = 3.75; // 30° / 8 = 3.75° per Kakshya

/**
 * Determine which Kakshya a planet is transiting within its current sign,
 * and whether that Kakshya lord has benefic bindus in the natal Ashtakavarga.
 */
function getKakshyaTransit(transitPlanet, natalAshtakavarga) {
  const degInSign = transitPlanet.sidereal % 30;
  const kakshyaIdx = Math.min(7, Math.floor(degInSign / KAKSHYA_SPAN));
  const kakshyaLord = KAKSHYA_LORDS[kakshyaIdx];

  let kakshyaStrength = 'neutral';
  if (natalAshtakavarga) {
    const pName = transitPlanet.name;
    const bavTable = natalAshtakavarga.prastarashtakavarga?.[pName];
    if (bavTable) {
      const bindus = bavTable[transitPlanet.rashiId] || 0;
      kakshyaStrength = bindus >= 5 ? 'strong' : bindus >= 3 ? 'moderate' : 'weak';
    }
  }

  return {
    kakshyaIndex: kakshyaIdx + 1,
    kakshyaLord,
    degreeInKakshya: degInSign - kakshyaIdx * KAKSHYA_SPAN,
    kakshyaStrength,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  ASHTAKAVARGA-WEIGHTED TRANSIT SCORING
// ═══════════════════════════════════════════════════════════════════════════
// Combines BAV bindus, SAV totals, Vedha, Kakshya, and retrograde status
// into a single 0-100 transit score per planet.

/**
 * Compute an Ashtakavarga-weighted transit score for a single planet.
 * @param {object} transitResult - Single planet result from getCurrentTransits()
 * @param {object} kakshya - Kakshya info from getKakshyaTransit()
 * @returns {number} Score 0-100
 */
function computeAshtakavargaTransitScore(transitResult, kakshya) {
  let score = 50; // base

  // BAV contribution (0-8 bindus → -24 to +24)
  if (transitResult.bavScore !== null) {
    score += (transitResult.bavScore - 4) * 6;
  }

  // SAV contribution (avg ~28, range 18-38 → -10 to +10)
  if (transitResult.savScore !== null) {
    score += (transitResult.savScore - 28) * 1;
  }

  // Transit effect quality
  if (transitResult.effect.quality === 'good') score += 10;
  else if (transitResult.effect.quality === 'bad') score -= 10;

  // Vedha blocks positive effects
  if (transitResult.vedhaBlocked) score -= 15;

  // Kakshya lord quality
  if (kakshya.kakshyaStrength === 'strong') score += 8;
  else if (kakshya.kakshyaStrength === 'weak') score -= 8;

  // Retrograde penalty (delays/complications)
  if (transitResult.isRetrograde) score -= 5;

  // Combust penalty
  if (transitResult.isCombust) score -= 10;

  // Conjunction with natal planet (activation)
  if (transitResult.conjunctsNatal) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Enhanced transit analysis: combines standard Gochara with
 * Ashtakavarga-weighted scores, Kakshya analysis, and double transit.
 */
function getEnhancedTransits(transitDate, birthDate, lat, lng) {
  const base = getCurrentTransits(transitDate, birthDate, lat, lng);
  if (!base) return null;

  let ashtakavarga = null;
  try { ashtakavarga = calculateAshtakavarga(new Date(birthDate), lat, lng); } catch (_) {}

  const transitPlanets = getAllPlanetPositions(transitDate ? new Date(transitDate) : new Date());
  const enhancedPlanets = {};

  for (const [key, result] of Object.entries(base.planets)) {
    const tp = transitPlanets[key];
    const kakshya = tp ? getKakshyaTransit(tp, ashtakavarga) : null;
    const aavScore = kakshya ? computeAshtakavargaTransitScore(result, kakshya) : null;

    enhancedPlanets[key] = {
      ...result,
      kakshya,
      ashtakavargaScore: aavScore,
      scoreLabel: aavScore !== null
        ? (aavScore >= 75 ? 'Excellent' : aavScore >= 60 ? 'Good' : aavScore >= 40 ? 'Average' : aavScore >= 25 ? 'Weak' : 'Difficult')
        : null,
    };
  }

  // Compute composite daily score from all planet Ashtakavarga scores
  const scores = Object.values(enhancedPlanets).map(p => p.ashtakavargaScore).filter(s => s !== null);
  const compositeScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  return {
    ...base,
    planets: enhancedPlanets,
    compositeAshtakavargaScore: compositeScore,
    compositeLabel: compositeScore !== null
      ? (compositeScore >= 70 ? 'Very Favourable' : compositeScore >= 55 ? 'Favourable' : compositeScore >= 40 ? 'Mixed' : 'Challenging')
      : null,
  };
}


// ═══════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Core transit
  getCurrentTransits,
  getEnhancedTransits,
  TRANSIT_EFFECTS,
  VEDHA_TABLE,
  COMBUSTION_DEGREES,

  // Ashtakavarga-weighted
  getKakshyaTransit,
  computeAshtakavargaTransitScore,

  // Forecasts
  getDailyForecast,
  getWeeklyForecast,
  getMonthlyForecast,
  getYearlyForecast,

  // Utilities
  getRetrogradePeriods,

  // Helpers
  getHouseSignification,
  getHouseArea,
};
