/**
 * SPECIFIC OCCUPATION CATALOG (era + region aware)
 * =================================================
 *
 * Vedic astrology can identify a planetary "career domain" with high
 * confidence (Saturn → long-tenure manual / govt-clerical work) but it
 * cannot — and was never designed to — predict an exact modern title
 * like "DevOps engineer at WSO2." Pretending otherwise is what makes
 * AI-written astrology reports lose user trust.
 *
 * Honest, high-accuracy approach:
 *   1. Classify the DOMAIN deterministically (parentProfession.js).
 *   2. From the domain, present a small, era-and-region-appropriate
 *      shortlist of SPECIFIC titles that were realistic for someone of
 *      this parent's generation in this country.
 *   3. Frame transparently: "the chart points to [domain]. For someone
 *      born in [era] in [country], the most common careers in this
 *      domain are [A], [B], [C]. If [A] doesn't match, [B] is the next
 *      most likely."
 *
 * The reader feels seen because (a) the domain is right, (b) the
 * specifics feel period-correct, and (c) we acknowledge the
 * uncertainty instead of inventing false precision.
 *
 * Catalog structure:
 *   {
 *     domainKey: {                       // matches PLANET_DOMAINS occupation strings
 *       LK: { traditional: [], modern: [] },   // Sri Lanka era-split
 *       IN: { traditional: [], modern: [] },   // India
 *       default: { traditional: [], modern: [] }
 *     }
 *   }
 *
 * "traditional" = parent born before 1970 (rural/agrarian SL economy
 *                 dominated; civil service & teaching were prestige jobs)
 * "modern"      = parent born 1970+ (private sector, IT, garment industry,
 *                 Middle-East labour migration era)
 */

const ERA_CUTOFF_YEAR = 1970;

// Domain key → {region → {era → [specific titles]}}
// Domain keys MUST match the LEADING TOKEN of each `PLANET_DOMAINS` occupation
// string so we can cheap-match by substring.
const SPECIFIC_CATALOG = {
  // ── SUN domain ────────────────────────────────────────────────
  'Government / civil service': {
    LK: {
      traditional: ['Government clerk (GA office, Kachcheri)', 'Postmaster', 'Railway officer', 'Police inspector', 'Grama Niladhari', 'Customs officer'],
      modern: ['Government department officer', 'Provincial council staff', 'State bank officer', 'Sri Lanka Administrative Service', 'Tax / inland revenue officer'],
    },
    IN: {
      traditional: ['Government clerk', 'Postmaster', 'Railway officer', 'Tehsildar', 'Police constable / inspector'],
      modern: ['IAS / IPS / IRS officer', 'PSU bank officer', 'State govt department staff', 'Income tax officer'],
    },
    default: {
      traditional: ['Government clerk', 'Civil servant', 'Postal officer', 'Police officer'],
      modern: ['Civil servant', 'Government department officer', 'Public sector employee'],
    },
  },
  'Doctor / medicine': {
    LK: {
      traditional: ['Government hospital doctor', 'Ayurvedic physician', 'Native vedamahaththaya', 'Apothecary'],
      modern: ['Government / private hospital doctor', 'Specialist consultant', 'Ayurvedic doctor', 'Pharmacist'],
    },
    default: {
      traditional: ['Hospital doctor', 'Traditional healer', 'Pharmacist'],
      modern: ['Doctor', 'Specialist physician', 'Pharmacist'],
    },
  },
  'Authority / administration / management': {
    LK: {
      traditional: ['Department head', 'School principal', 'Estate superintendent', 'Mudaliyar / Rate Mahatmaya'],
      modern: ['Manager / senior manager', 'CEO / director (SME)', 'School principal', 'Bank branch manager'],
    },
    default: {
      traditional: ['Department head', 'Estate superintendent', 'School principal'],
      modern: ['Manager', 'Director', 'Branch manager'],
    },
  },
  'Politics / public office': {
    LK: { traditional: ['Local political organiser', 'Pradeshiya Sabha member'], modern: ['Politician', 'Local council member', 'Political party organiser'] },
    default: { traditional: ['Local political worker'], modern: ['Politician', 'Local council member'] },
  },

  // ── MOON domain ───────────────────────────────────────────────
  'Public-facing service (hospitality, nursing, retail)': {
    LK: {
      traditional: ['Shopkeeper / kade owner', 'Hotel / rest-house staff', 'Nurse', 'Tea-shop proprietor', 'Marketplace trader'],
      modern: ['Retail shop owner', 'Hotel / hospitality staff', 'Nurse', 'Receptionist / customer service', 'Supermarket employee'],
    },
    default: { traditional: ['Shopkeeper', 'Innkeeper', 'Nurse'], modern: ['Retail', 'Hospitality staff', 'Nurse', 'Customer service'] },
  },
  'Dairy / food / agriculture': {
    LK: {
      traditional: ['Paddy farmer', 'Coconut estate worker', 'Tea estate worker', 'Fisherman', 'Vegetable cultivator'],
      modern: ['Agricultural officer', 'Food processing worker', 'Dairy farmer', 'Restaurant cook / owner'],
    },
    default: { traditional: ['Farmer', 'Dairy worker', 'Fisherman'], modern: ['Farmer', 'Food industry worker', 'Restaurateur'] },
  },
  'Water-related (sailor, fisherman, plumbing, beverages)': {
    LK: { traditional: ['Fisherman', 'Boatman', 'Sailor', 'Toddy tapper'], modern: ['Plumber', 'Beverage industry worker', 'Sailor / merchant marine'] },
    default: { traditional: ['Fisherman', 'Sailor'], modern: ['Plumber', 'Beverage industry'] },
  },
  'Caregiving / nursing / childcare': {
    LK: { traditional: ['Midwife', 'Nurse', 'Childminder', 'Family caregiver'], modern: ['Nurse / nursing officer', 'Caregiver (often abroad — Middle East / Italy)', 'Preschool teacher', 'Care home staff'] },
    default: { traditional: ['Midwife', 'Nurse'], modern: ['Nurse', 'Caregiver', 'Preschool teacher'] },
  },
  'Hospitality / restaurant / catering': {
    LK: { traditional: ['Cook', 'Tea-boutique owner', 'Rest-house cook'], modern: ['Hotel chef', 'Restaurant owner', 'Catering staff', 'Hotel manager'] },
    default: { traditional: ['Cook', 'Innkeeper'], modern: ['Chef', 'Restaurant owner', 'Hotel staff'] },
  },

  // ── MARS domain ───────────────────────────────────────────────
  'Engineering / mechanical / technical trades': {
    LK: { traditional: ['Mechanic', 'Carpenter', 'Mason', 'Welder', 'Lorry driver'], modern: ['Engineer (civil / mechanical / electrical)', 'Vehicle mechanic', 'Factory technician', 'CEB / SLT field engineer'] },
    default: { traditional: ['Mechanic', 'Carpenter', 'Welder'], modern: ['Engineer', 'Technician', 'Mechanic'] },
  },
  'Military / police / security': {
    LK: { traditional: ['Army / navy / air force soldier', 'Police constable', 'Special Task Force', 'Civil Defence Force'], modern: ['Tri-forces officer or soldier', 'Police officer', 'Private security officer', 'Veteran (post-2009 retiree)'] },
    default: { traditional: ['Soldier', 'Police constable', 'Security guard'], modern: ['Military officer', 'Police officer', 'Private security'] },
  },
  'Surgery / dentistry': {
    LK: { traditional: ['Hospital surgeon', 'Dental practitioner'], modern: ['Surgeon', 'Dentist', 'Dental surgeon'] },
    default: { traditional: ['Surgeon', 'Dentist'], modern: ['Surgeon', 'Dentist'] },
  },
  'Sports / athletics / fitness': {
    LK: { traditional: ['Sportsman / athlete', 'Sports coach', 'PE teacher'], modern: ['Athlete', 'Cricket / sports professional', 'Personal trainer / coach', 'Sports club staff'] },
    default: { traditional: ['Athlete', 'Sports coach'], modern: ['Athlete', 'Personal trainer'] },
  },
  'Construction / metalwork / fire-related work': {
    LK: { traditional: ['Mason', 'Blacksmith', 'Iron worker', 'Brick maker'], modern: ['Construction worker (often Middle East migrant labourer)', 'Steel-fabrication welder', 'Foundry worker', 'Site supervisor'] },
    default: { traditional: ['Mason', 'Blacksmith'], modern: ['Construction worker', 'Welder', 'Site supervisor'] },
  },

  // ── MERCURY domain ────────────────────────────────────────────
  'Writing / journalism / publishing / editing': {
    LK: { traditional: ['Newspaper journalist', 'Schoolbook author', 'Translator', 'Lake House staff'], modern: ['Journalist', 'Editor', 'Content writer', 'Author', 'PR / communications staff'] },
    default: { traditional: ['Journalist', 'Author', 'Translator'], modern: ['Journalist', 'Content writer', 'Editor'] },
  },
  'Accounting / commerce / banking': {
    LK: { traditional: ['Bank clerk', 'Cashier', 'Bookkeeper', 'Trader / shop owner'], modern: ['Accountant (CIMA / ACCA / ICASL)', 'Auditor', 'Bank officer (BoC / People\'s Bank / commercial)', 'Tax consultant'] },
    default: { traditional: ['Bank clerk', 'Bookkeeper', 'Trader'], modern: ['Accountant', 'Auditor', 'Bank officer'] },
  },
  'Software / IT / data': {
    LK: { traditional: ['(Not era-appropriate — pre-1970 technology limited)'], modern: ['Software engineer (IFS / WSO2 / Virtusa / 99X / MillenniumIT)', 'IT technician', 'Data analyst', 'QA engineer', 'Network admin'] },
    default: { traditional: ['(Not era-appropriate)'], modern: ['Software engineer', 'IT technician', 'Data analyst'] },
  },
  'Teaching (esp. mathematics, language)': {
    LK: { traditional: ['School teacher', 'Tutor', 'University lecturer'], modern: ['School teacher (govt or private)', 'Tuition class teacher', 'University lecturer', 'International school teacher'] },
    default: { traditional: ['School teacher', 'Tutor'], modern: ['Teacher', 'Lecturer'] },
  },
  'Sales / trade / brokerage': {
    LK: { traditional: ['Travelling salesman', 'Trader / merchant', 'Broker / commission agent', 'Wholesale dealer'], modern: ['Sales executive', 'Insurance agent', 'Real estate broker', 'Pharma sales rep'] },
    default: { traditional: ['Travelling salesman', 'Merchant'], modern: ['Sales executive', 'Broker', 'Agent'] },
  },
  'Communications / media': {
    LK: { traditional: ['Telegraph / postal staff', 'Newspaper staff', 'Radio (SLBC) staff'], modern: ['Telecom employee (SLT / Dialog / Mobitel)', 'Media production staff', 'Marketing / advertising staff'] },
    default: { traditional: ['Postal / telegraph staff', 'Newspaper staff'], modern: ['Telecom employee', 'Media production'] },
  },

  // ── JUPITER domain ────────────────────────────────────────────
  'Teaching / professor / educator': {
    LK: { traditional: ['School teacher', 'Pirivena teacher', 'University lecturer / professor'], modern: ['School teacher', 'University lecturer / professor', 'Tuition class founder', 'Curriculum / education officer'] },
    default: { traditional: ['Teacher', 'Professor'], modern: ['Teacher', 'Lecturer', 'Academic'] },
  },
  'Law / judiciary / advocacy': {
    LK: { traditional: ['Proctor', 'Notary public', 'Magistrate', 'Crown counsel'], modern: ['Attorney-at-law', 'Notary', 'Judge / magistrate', 'Legal officer (govt / corporate)'] },
    default: { traditional: ['Lawyer', 'Notary', 'Judge'], modern: ['Attorney', 'Notary', 'Judge', 'Legal officer'] },
  },
  'Banking / finance / advisory': {
    LK: { traditional: ['Bank manager', 'Insurance agent'], modern: ['Senior banker', 'Financial advisor / wealth manager', 'Insurance executive', 'Investment / treasury officer'] },
    default: { traditional: ['Bank manager', 'Insurance agent'], modern: ['Banker', 'Financial advisor', 'Insurance executive'] },
  },
  'Religious / philosophical / counselling': {
    LK: { traditional: ['Buddhist monk / dayaka organiser', 'Catholic priest / nun', 'Astrologer / shastra scholar'], modern: ['Religious teacher / preacher', 'Counsellor', 'Astrologer / spiritual advisor', 'Mental-health counsellor'] },
    default: { traditional: ['Priest / monk', 'Astrologer'], modern: ['Counsellor', 'Religious teacher', 'Astrologer'] },
  },
  'Medicine (esp. paediatrics, traditional)': {
    LK: { traditional: ['Native physician (Sinhala vedakama)', 'Paediatrician', 'Family doctor'], modern: ['Paediatrician', 'Family GP', 'Ayurvedic doctor', 'Public health officer'] },
    default: { traditional: ['Family doctor', 'Traditional healer'], modern: ['Paediatrician', 'GP', 'Ayurvedic doctor'] },
  },

  // ── VENUS domain ──────────────────────────────────────────────
  'Arts / music / dance / performance': {
    LK: { traditional: ['Drum (bera) player', 'Kandyan dancer', 'Folk musician', 'Stage actor'], modern: ['Musician / singer', 'Dancer / choreographer', 'Actor (TV / film / stage)', 'Music teacher'] },
    default: { traditional: ['Musician', 'Dancer', 'Actor'], modern: ['Musician', 'Performer', 'Music teacher'] },
  },
  'Beauty / fashion / cosmetics / textiles': {
    LK: { traditional: ['Tailor', 'Goldsmith', 'Weaver', 'Henna / hairdresser'], modern: ['Garment-factory worker / supervisor', 'Fashion designer', 'Beautician / salon owner', 'Boutique owner'] },
    default: { traditional: ['Tailor', 'Goldsmith', 'Weaver'], modern: ['Garment worker', 'Designer', 'Beautician'] },
  },
  'Hospitality / luxury / entertainment': {
    LK: { traditional: ['Hotel staff', 'Cinema staff', 'Caterer'], modern: ['Hotel manager / staff', 'Event organiser', 'Tourism industry staff', 'Spa / wellness operator'] },
    default: { traditional: ['Hotel staff', 'Caterer'], modern: ['Hotel manager', 'Event organiser', 'Tourism staff'] },
  },
  'Design / interior / decoration': {
    LK: { traditional: ['Painter / artist', 'Wood carver', 'Sign painter'], modern: ['Interior designer', 'Architect', 'Graphic designer', 'Floral / event decorator'] },
    default: { traditional: ['Painter', 'Wood carver'], modern: ['Interior designer', 'Architect', 'Graphic designer'] },
  },
  'Vehicles / transport (esp. private)': {
    LK: { traditional: ['Bus / lorry driver', 'Bullock-cart owner', 'Taxi driver'], modern: ['Driver (own vehicle / chauffeur)', 'Vehicle dealer / showroom owner', 'Three-wheel owner-operator', 'Logistics / shipping staff'] },
    default: { traditional: ['Driver', 'Cart owner'], modern: ['Driver', 'Vehicle dealer', 'Logistics staff'] },
  },

  // ── SATURN domain ─────────────────────────────────────────────
  'Manual labour / construction / mining': {
    LK: { traditional: ['Estate / paddy labourer', 'Mason / brick layer', 'Gem mine worker (Ratnapura)', 'Rubber tapper'], modern: ['Construction labourer (often Gulf migrant)', 'Garment factory worker', 'Gem industry worker', 'Plantation worker'] },
    default: { traditional: ['Labourer', 'Miner', 'Mason'], modern: ['Construction worker', 'Factory worker', 'Plantation worker'] },
  },
  'Oil / coal / heavy industry': {
    LK: { traditional: ['Oil-mill worker (kapuru)', 'Steel mill worker', 'Cement-factory worker'], modern: ['CPC / Ceylon Petroleum staff', 'Heavy industry / steel worker', 'Manufacturing operative', 'Gulf oil-industry migrant worker'] },
    default: { traditional: ['Oil-mill worker', 'Steel worker'], modern: ['Petroleum industry', 'Heavy industry', 'Manufacturing'] },
  },
  'Agriculture / farming (long-term)': {
    LK: { traditional: ['Paddy farmer', 'Tea / rubber estate owner', 'Coconut cultivator'], modern: ['Farmer', 'Estate manager', 'Plantation worker', 'Agriculture extension officer'] },
    default: { traditional: ['Farmer', 'Estate owner'], modern: ['Farmer', 'Estate manager'] },
  },
  'Government clerical / civil service': {
    LK: { traditional: ['Govt clerk (Kachcheri)', 'Postal clerk', 'Treasury clerk', 'Court clerk'], modern: ['Govt department clerk / officer', 'Public-sector accountant', 'Statutory board staff'] },
    default: { traditional: ['Government clerk', 'Postal clerk'], modern: ['Government clerk', 'Public sector officer'] },
  },
  'Iron / steel / leather / waste / sanitation': {
    LK: { traditional: ['Blacksmith', 'Shoemaker / leather worker', 'Sanitation worker'], modern: ['Steel-fabrication worker', 'Leather goods maker', 'Municipal sanitation staff', 'Recycling / waste worker'] },
    default: { traditional: ['Blacksmith', 'Shoemaker', 'Sanitation worker'], modern: ['Steel worker', 'Sanitation', 'Recycling'] },
  },
  'Long-tenure technical or scientific work': {
    LK: { traditional: ['Surveyor', 'Drafstman / draughtsman', 'Hospital lab assistant'], modern: ['Surveyor', 'Quality control inspector', 'Lab technician', 'Senior technician / foreman'] },
    default: { traditional: ['Surveyor', 'Lab assistant'], modern: ['Surveyor', 'QC inspector', 'Lab technician'] },
  },

  // ── RAHU domain ───────────────────────────────────────────────
  'Foreign country / immigration / overseas work': {
    LK: { traditional: ['Migrant labourer (Malaysia / Singapore plantations)', 'Overseas Ceylon Tea trader'], modern: ['Middle East migrant worker (Saudi / UAE / Kuwait)', 'Italian / South Korean migrant worker', 'Foreign-based professional (Australia / UK / Canada)', 'Diaspora businessman'] },
    default: { traditional: ['Migrant worker'], modern: ['Migrant worker', 'Diaspora professional', 'Expat'] },
  },
  'Technology / unconventional fields': {
    LK: { traditional: ['(Not era-appropriate)'], modern: ['IT / software engineer', 'Telecom engineer', 'Crypto / fintech worker', 'Digital marketing'] },
    default: { traditional: ['Inventor / tinkerer'], modern: ['IT engineer', 'Telecom', 'Digital marketing'] },
  },
  'Aviation / electronics / photography': {
    LK: { traditional: ['Photographer', 'Radio repair'], modern: ['Pilot / cabin crew', 'Aviation engineer', 'Electronics technician', 'Photographer / videographer'] },
    default: { traditional: ['Photographer', 'Radio repair'], modern: ['Pilot', 'Aviation engineer', 'Photographer'] },
  },
  'Politics / underworld / speculation': {
    LK: { traditional: ['Political organiser'], modern: ['Politician', 'Stock-market trader', 'Property speculator'] },
    default: { traditional: ['Political organiser'], modern: ['Politician', 'Speculator'] },
  },
  'Pharmaceuticals / chemicals': {
    LK: { traditional: ['Apothecary / dispenser'], modern: ['Pharmacist', 'Pharmaceutical sales rep', 'Chemical / fertiliser industry worker'] },
    default: { traditional: ['Apothecary'], modern: ['Pharmacist', 'Chemical industry'] },
  },

  // ── KETU domain ───────────────────────────────────────────────
  'Spiritual / monastic / occult / astrology': {
    LK: { traditional: ['Buddhist monk', 'Astrologer', 'Tovil / kapurala (ritualist)'], modern: ['Astrologer', 'Vedic / spiritual practitioner', 'Reiki / alternative therapist', 'Religious organiser'] },
    default: { traditional: ['Monk', 'Astrologer', 'Ritualist'], modern: ['Astrologer', 'Spiritual practitioner', 'Alternative therapist'] },
  },
  'Research / investigation / forensics': {
    LK: { traditional: ['Police investigator'], modern: ['CID detective', 'Forensic analyst', 'University researcher', 'Investigative journalist'] },
    default: { traditional: ['Investigator'], modern: ['Detective', 'Forensic analyst', 'Researcher'] },
  },
  'Medicine (esp. healing, surgery)': {
    LK: { traditional: ['Native healer', 'Hospital doctor'], modern: ['Surgeon', 'Alternative medicine practitioner', 'Hospital doctor'] },
    default: { traditional: ['Healer', 'Doctor'], modern: ['Surgeon', 'Alternative practitioner'] },
  },
  'Computers / mathematics / abstract work': {
    LK: { traditional: ['(Not era-appropriate)'], modern: ['Software engineer', 'Mathematician / statistician', 'Researcher / academic'] },
    default: { traditional: ['(Not era-appropriate)'], modern: ['Software engineer', 'Mathematician', 'Academic'] },
  },

  // ── SME / SMALL-BUSINESS BLEND DOMAINS ───────────────────────
  // These domains are surfaced by the planet-pair amplifiers in
  // parentProfession.js. They capture the most common Sri Lankan / Indian
  // family-run businesses that classical PLANET_DOMAINS dilute across
  // 3-4 categories.
  'Furniture / wood trade / home-furnishings retail': {
    LK: {
      traditional: ['Carpenter / wood-worker', 'Furniture-shop owner (Moratuwa style)', 'Timber merchant', 'Cabinet maker'],
      modern: ['Furniture-shop / showroom owner', 'Custom carpentry / interior fit-out business', 'Mattress / home-furnishings retailer', 'Importer of imported furniture'],
    },
    IN: {
      traditional: ['Carpenter', 'Timber merchant', 'Furniture-shop owner'],
      modern: ['Furniture / home-decor showroom owner', 'Modular kitchen / interior business', 'Wood-working SME proprietor'],
    },
    default: {
      traditional: ['Carpenter', 'Furniture-shop owner', 'Timber merchant'],
      modern: ['Furniture-store owner', 'Home-decor retailer', 'Custom carpentry business'],
    },
  },
  'Timber / sawmill / carpentry / furniture-making': {
    LK: {
      traditional: ['Sawmill owner', 'Master carpenter', 'Wood carver', 'Coffin-maker'],
      modern: ['Sawmill / timber-yard operator', 'Custom furniture manufacturer', 'Carpentry workshop owner'],
    },
    default: {
      traditional: ['Sawmill worker', 'Master carpenter', 'Wood carver'],
      modern: ['Sawmill operator', 'Furniture manufacturer', 'Carpentry workshop'],
    },
  },
  'Textile / clothing / saree retail': {
    LK: {
      traditional: ['Cloth merchant (Pettah / Maradana)', 'Tailor with shop', 'Saree-shop owner', 'Handloom trader'],
      modern: ['Saree / clothing showroom owner', 'Boutique / fashion retailer', 'Garment wholesale dealer', 'Pettah cloth-shop owner'],
    },
    IN: {
      traditional: ['Cloth / saree merchant', 'Tailor with shop', 'Handloom dealer'],
      modern: ['Saree showroom owner', 'Textile wholesaler', 'Boutique / fashion retailer'],
    },
    default: {
      traditional: ['Cloth merchant', 'Tailor / shop owner', 'Textile dealer'],
      modern: ['Clothing-store owner', 'Boutique retailer', 'Textile wholesaler'],
    },
  },
  'Jewellery / gold / silver retail': {
    LK: {
      traditional: ['Goldsmith with shop', 'Silver merchant', 'Pawn-broker'],
      modern: ['Jewellery showroom owner', 'Gold / silver retailer', 'Pawn-broker / gold-loan business'],
    },
    default: {
      traditional: ['Goldsmith', 'Silver merchant', 'Pawn-broker'],
      modern: ['Jewellery store owner', 'Gold retailer', 'Pawn-broker'],
    },
  },
  'Small business / shopkeeper / SME proprietor': {
    LK: {
      traditional: ['Kade / village shop owner', 'Wholesale trader', 'Bakery / hotel owner', 'Hardware-shop owner'],
      modern: ['Grocery / supermarket owner', 'Hardware-shop owner', 'Bakery / restaurant owner', 'SME proprietor', 'Stationery / book-shop owner'],
    },
    IN: {
      traditional: ['Kirana / village shop owner', 'Wholesale trader', 'Hardware merchant'],
      modern: ['Kirana / supermarket owner', 'Hardware merchant', 'SME proprietor', 'Franchise-shop owner'],
    },
    default: {
      traditional: ['Shopkeeper', 'Wholesale trader', 'Family-business owner'],
      modern: ['Shop owner', 'SME proprietor', 'Small-business owner'],
    },
  },
  'Homemaker / household management / family caregiving': {
    LK: {
      traditional: ['Homemaker (gedara amma) — managed household, raised children, supported extended family'],
      modern: ['Homemaker (gedara amma) — full-time household management and child-rearing', 'Home-based informal income (tuition, sewing, food preparation, beauty work)'],
    },
    IN: {
      traditional: ['Homemaker — household management, child-rearing, joint-family support'],
      modern: ['Homemaker — full-time household management', 'Home-based small income (tiffin, tailoring, tuition)'],
    },
    default: {
      traditional: ['Homemaker — household management and family caregiving'],
      modern: ['Homemaker — full-time household management', 'Home-based informal income work'],
    },
  },
  'Retired / non-working / home-based': {
    default: {
      traditional: ['Retired', 'Non-working / pensioner'],
      modern: ['Retired', 'Pensioner', 'Non-working / home-based'],
    },
  },
};

// ─────────────────────────────────────────────────────────────────────
// REGION OVERRIDES — global markets beyond LK/IN.
// ---------------------------------------------------------------------
// We keep the master SPECIFIC_CATALOG SL/IN-detailed (because those are
// our largest user bases) and layer region-specific titles on top here.
// Lookup order: REGION_OVERRIDES[region][domain] → SPECIFIC_CATALOG[domain][region]
//   → SPECIFIC_CATALOG[domain].default → [].
// Only domains where the title genuinely changes by culture are listed
// — generic "Doctor" or "Lawyer" can fall through to default.
// ─────────────────────────────────────────────────────────────────────
const REGION_OVERRIDES = {
  US: {
    'Government / civil service': { traditional: ['Postal service worker', 'County clerk', 'DMV employee', 'Police officer', 'Federal civil servant'], modern: ['Federal / state employee', 'Postal service (USPS) worker', 'County clerk', 'Police officer', 'Public school administrator'] },
    'Government clerical / civil service': { traditional: ['Postal clerk', 'County clerk', 'IRS clerk'], modern: ['IRS / state revenue clerk', 'County administrative clerk', 'Postal service worker', 'DMV clerk'] },
    'Software / IT / data': { traditional: ['(pre-1970 — rare; mainframe operator if any)'], modern: ['Software engineer (Big Tech / startup)', 'Data scientist', 'DevOps engineer', 'IT support', 'Product manager (tech)'] },
    'Engineering / mechanical / technical trades': { traditional: ['Auto mechanic', 'Carpenter', 'Welder', 'Factory machinist', 'Plumber'], modern: ['Engineer (mech / civil / electrical)', 'HVAC technician', 'Aerospace technician', 'Auto mechanic', 'IT-adjacent engineer'] },
    'Foreign country / immigration / overseas work': { traditional: ['Immigrant worker (1st gen)'], modern: ['Foreign-posted professional', 'Diplomatic / State Dept staff', 'Multinational expat', 'Immigrant entrepreneur'] },
    'Manual labour / construction / mining': { traditional: ['Factory worker', 'Coal miner', 'Steel mill worker', 'Farmhand'], modern: ['Construction worker', 'Warehouse / logistics worker', 'Manufacturing operative', 'Oil-field worker'] },
    'Banking / finance / advisory': { traditional: ['Bank manager', 'Insurance broker'], modern: ['Banker / financial advisor', 'Wall Street analyst', 'Insurance executive', 'Wealth manager'] },
    'Sales / trade / brokerage': { traditional: ['Travelling salesman', 'Auto dealer'], modern: ['Sales executive', 'Real estate agent / Realtor', 'Insurance agent', 'B2B sales rep'] },
    'Military / police / security': { traditional: ['US Army / Navy / Air Force / Marine', 'Police officer', 'Sheriff'], modern: ['US military service member or veteran', 'Police officer', 'Federal agent', 'Private security contractor'] },
  },
  UK: {
    'Government / civil service': { traditional: ['Civil servant (Whitehall)', 'Royal Mail postman', 'Council officer', 'Police constable'], modern: ['Civil servant', 'Council / local authority officer', 'NHS administrator', 'Police officer'] },
    'Government clerical / civil service': { traditional: ['Council clerk', 'HMRC / Inland Revenue clerk', 'Royal Mail clerk'], modern: ['Civil service administrator', 'Council officer', 'HMRC officer'] },
    'Doctor / medicine': { traditional: ['NHS hospital doctor', 'GP', 'Consultant'], modern: ['NHS doctor / GP', 'Specialist consultant', 'Locum doctor'] },
    'Engineering / mechanical / technical trades': { traditional: ['Factory mechanic', 'Shipyard worker', 'Engineer (BR / British Steel)'], modern: ['Engineer', 'BAE / Rolls-Royce technician', 'HGV mechanic'] },
    'Banking / finance / advisory': { traditional: ['High-street bank manager', 'Insurance underwriter'], modern: ['Banker (City of London)', 'Financial advisor', 'Insurance executive'] },
    'Manual labour / construction / mining': { traditional: ['Coal miner', 'Dock worker', 'Factory hand'], modern: ['Construction worker', 'Warehouse worker', 'HGV driver'] },
    'Software / IT / data': { traditional: ['(pre-1970 — rare)'], modern: ['Software engineer', 'Data analyst', 'IT consultant', 'DevOps engineer'] },
  },
  EU: {
    'Government / civil service': { traditional: ['Civil servant', 'Postal worker', 'Tax officer', 'Municipal officer'], modern: ['Civil servant', 'EU institution staff', 'Municipal officer', 'Public administrator'] },
    'Engineering / mechanical / technical trades': { traditional: ['Factory mechanic', 'Auto-industry technician (DE/IT/FR)', 'Welder'], modern: ['Engineer (auto / aerospace)', 'Industrial technician', 'Mechanical engineer'] },
    'Manual labour / construction / mining': { traditional: ['Factory worker', 'Miner', 'Farmhand'], modern: ['Construction worker', 'Warehouse / logistics worker', 'Manufacturing operative'] },
    'Foreign country / immigration / overseas work': { traditional: ['Migrant guest worker (Gastarbeiter era)'], modern: ['Cross-border professional', 'EU-mobility worker', 'Immigrant entrepreneur'] },
    'Software / IT / data': { traditional: ['(pre-1970 — rare)'], modern: ['Software engineer', 'IT consultant', 'Data engineer'] },
  },
  ME: {
    'Government / civil service': { traditional: ['Government clerk', 'Royal court staff', 'Customs officer'], modern: ['Govt ministry employee', 'Municipality officer', 'Public sector administrator'] },
    'Oil / coal / heavy industry': { traditional: ['Oil-field labourer', 'Refinery worker'], modern: ['Oil & gas engineer / technician', 'ARAMCO / ADNOC / KOC employee', 'Refinery / petrochemical worker'] },
    'Manual labour / construction / mining': { traditional: ['Construction labourer', 'Souk porter'], modern: ['Construction worker (often migrant)', 'Site supervisor', 'Logistics worker'] },
    'Sales / trade / brokerage': { traditional: ['Souk merchant', 'Trader'], modern: ['Trader', 'Real estate broker', 'Wholesale dealer'] },
    'Foreign country / immigration / overseas work': { traditional: ['Pearl diver / sailor'], modern: ['Expat professional (Gulf cities)', 'Diaspora businessman'] },
    'Engineering / mechanical / technical trades': { traditional: ['Mechanic', 'Welder'], modern: ['Engineer (oil & gas)', 'Mechanical / civil engineer', 'HVAC technician'] },
  },
  AU: {
    'Government / civil service': { traditional: ['Public servant (Commonwealth / state)', 'Postal worker', 'Police officer'], modern: ['APS / state public servant', 'Council officer', 'Police officer', 'Centrelink staff'] },
    'Manual labour / construction / mining': { traditional: ['Mine worker (coal / iron ore)', 'Shearer', 'Cane cutter'], modern: ['FIFO mine worker (Pilbara / NT)', 'Construction worker', 'Tradie (carpenter / electrician)'] },
    'Engineering / mechanical / technical trades': { traditional: ['Mechanic', 'Welder', 'Diesel fitter'], modern: ['Engineer (mining / civil)', 'Tradie (electrician / plumber / carpenter)', 'Diesel mechanic'] },
    'Agriculture / farming (long-term)': { traditional: ['Sheep / cattle station owner', 'Wheat farmer'], modern: ['Cattle / sheep grazier', 'Wine / orchard producer', 'Agribusiness operator'] },
    'Software / IT / data': { traditional: ['(pre-1970 — rare)'], modern: ['Software engineer', 'IT consultant', 'Data analyst'] },
  },
  EA: {
    'Government / civil service': { traditional: ['Government clerk', 'Local cadre / municipal officer', 'Postal worker'], modern: ['Government / party / civil servant', 'Municipal officer', 'State-owned enterprise staff'] },
    'Manual labour / construction / mining': { traditional: ['Factory worker', 'Coal miner', 'Farmhand'], modern: ['Construction worker', 'Factory operative (electronics / auto)', 'Logistics / warehouse worker'] },
    'Software / IT / data': { traditional: ['(pre-1970 — rare)'], modern: ['Software engineer', 'IT engineer', 'Data engineer', 'Game / app developer'] },
    'Engineering / mechanical / technical trades': { traditional: ['Mechanic', 'Factory technician', 'Welder'], modern: ['Engineer (auto / electronics / industrial)', 'Manufacturing technician', 'Mechanical engineer'] },
    'Sales / trade / brokerage': { traditional: ['Merchant', 'Wholesale trader'], modern: ['Sales executive', 'Trade / export specialist', 'Real estate broker'] },
  },
  SEA: {
    'Government / civil service': { traditional: ['Civil servant', 'Police constable', 'Postal worker'], modern: ['Government officer', 'Municipal staff', 'Public sector employee'] },
    'Manual labour / construction / mining': { traditional: ['Rice farmer-labourer', 'Plantation worker', 'Mine worker'], modern: ['Construction worker', 'Factory / garment worker', 'Plantation worker'] },
    'Foreign country / immigration / overseas work': { traditional: ['Plantation migrant worker'], modern: ['Overseas Filipino / Indonesian worker (OFW / TKI)', 'Maritime / shipping crew', 'Diaspora professional'] },
    'Software / IT / data': { traditional: ['(pre-1970 — rare)'], modern: ['Software engineer', 'IT support', 'Tech outsourcing professional'] },
  },
  AF: {
    'Government / civil service': { traditional: ['Civil servant (colonial / post-independence)', 'Postal worker', 'Police officer'], modern: ['Government officer', 'Municipal staff', 'Public sector administrator'] },
    'Agriculture / farming (long-term)': { traditional: ['Subsistence farmer', 'Cocoa / coffee / tea farmer'], modern: ['Smallholder farmer', 'Agribusiness worker', 'Plantation worker'] },
    'Manual labour / construction / mining': { traditional: ['Mine worker', 'Plantation labourer'], modern: ['Mine worker (gold / copper / cobalt)', 'Construction worker', 'Informal economy trader'] },
    'Sales / trade / brokerage': { traditional: ['Market trader'], modern: ['Market trader', 'Mobile / SIM-card retailer', 'Cross-border trader'] },
  },
  LATAM: {
    'Government / civil service': { traditional: ['Civil servant', 'Postal worker', 'Police officer'], modern: ['Government officer', 'Municipal staff', 'Public sector administrator'] },
    'Manual labour / construction / mining': { traditional: ['Campesino / farmhand', 'Mine worker', 'Sugar-cane cutter'], modern: ['Construction worker', 'Mine worker (copper / silver)', 'Factory worker (maquila)'] },
    'Foreign country / immigration / overseas work': { traditional: ['Migrant farm worker (US / Europe)'], modern: ['Migrant worker (US)', 'Diaspora professional', 'Remittance-sending labourer'] },
    'Sales / trade / brokerage': { traditional: ['Travelling merchant'], modern: ['Sales executive', 'Real estate broker', 'Informal trader'] },
  },
  CA: {
    'Government / civil service': { traditional: ['Federal / provincial civil servant', 'Canada Post worker', 'RCMP officer'], modern: ['Federal / provincial public servant', 'Canada Post worker', 'Municipal officer'] },
    'Manual labour / construction / mining': { traditional: ['Mine worker', 'Logger', 'Factory worker'], modern: ['Oil-sands worker (Alberta)', 'Construction worker', 'Logistics / warehouse worker'] },
    'Engineering / mechanical / technical trades': { traditional: ['Mechanic', 'Carpenter', 'Welder'], modern: ['Engineer', 'Red Seal tradesperson', 'Technician'] },
    'Software / IT / data': { traditional: ['(pre-1970 — rare)'], modern: ['Software engineer', 'IT consultant', 'Data analyst'] },
  },
  PK: {
    'Government / civil service': { traditional: ['Government clerk', 'Patwari', 'Postal officer', 'Police constable'], modern: ['CSS officer', 'Govt department staff', 'Municipal officer', 'Police officer'] },
    'Manual labour / construction / mining': { traditional: ['Farm labourer', 'Brick-kiln worker', 'Mine worker'], modern: ['Construction worker (often Gulf migrant)', 'Brick-kiln worker', 'Factory worker'] },
    'Foreign country / immigration / overseas work': { traditional: ['Migrant labourer'], modern: ['Gulf migrant worker', 'UK / US diaspora professional'] },
  },
  BD: {
    'Government / civil service': { traditional: ['Govt clerk', 'Postal officer'], modern: ['BCS officer', 'Govt department staff', 'Municipal officer'] },
    'Manual labour / construction / mining': { traditional: ['Farm labourer', 'Boatman'], modern: ['Garment-factory worker', 'Construction worker (often Gulf migrant)', 'Rickshaw puller'] },
    'Foreign country / immigration / overseas work': { traditional: ['(rare pre-1970)'], modern: ['Gulf migrant worker', 'Maritime crew', 'Diaspora professional'] },
  },
  NP: {
    'Government / civil service': { traditional: ['Government clerk', 'Postal officer'], modern: ['Govt department staff', 'Municipal officer'] },
    'Foreign country / immigration / overseas work': { traditional: ['Gurkha soldier (British / Indian army)'], modern: ['Gulf migrant worker', 'Malaysia / Korea migrant worker', 'Diaspora professional'] },
    'Manual labour / construction / mining': { traditional: ['Farm labourer', 'Porter'], modern: ['Construction worker (often migrant)', 'Trekking porter / guide'] },
  },
};

/**
 * Pick a region-and-era-appropriate shortlist of specific titles for a
 * given domain.
 *
 * @param {string} domainOccupation - one of the strings from PLANET_DOMAINS
 * @param {object} ctx
 * @param {number} [ctx.parentBirthYear] - if known
 * @param {number} ctx.nativeBirthYear   - native's birth year (parent ~ -27)
 * @param {string} [ctx.region='LK']     - 'LK' | 'IN' | 'default'
 * @returns {{ era: string, region: string, titles: string[], note: string }}
 */
function specificTitlesForDomain(domainOccupation, ctx = {}) {
  if (!domainOccupation) return { era: 'unknown', region: 'default', titles: [], note: '' };

  const region = ctx.region || 'default';
  // Estimate parent birth year if not provided (parent ~27 years older)
  const parentBirthYear =
    ctx.parentBirthYear || (ctx.nativeBirthYear ? ctx.nativeBirthYear - 27 : new Date().getFullYear() - 30);
  const era = parentBirthYear < ERA_CUTOFF_YEAR ? 'traditional' : 'modern';

  // Lookup priority:
  //   1. REGION_OVERRIDES[region][domain]   — global region-specific
  //   2. SPECIFIC_CATALOG[domain][region]   — primarily LK/IN
  //   3. SPECIFIC_CATALOG[domain].default   — generic global
  let titles = [];
  let resolvedRegion = region;
  const ovr = REGION_OVERRIDES[region]?.[domainOccupation];
  if (ovr && ovr[era]?.length) {
    titles = ovr[era];
  } else {
    const entry = SPECIFIC_CATALOG[domainOccupation];
    if (!entry) return { era, region, titles: [], note: 'no catalog entry for this domain' };
    const regionEntry = entry[region] || entry.default;
    if (!regionEntry) {
      resolvedRegion = 'default';
    } else if (entry[region]) {
      // matched primary catalog
    } else {
      resolvedRegion = 'default';
    }
    const src = regionEntry || entry.default || {};
    titles = src[era] || src.traditional || [];
  }

  titles = titles.filter(t => !t.startsWith('('));
  const note = era === 'traditional'
    ? `Era: traditional (parent born before ${ERA_CUTOFF_YEAR})`
    : `Era: modern (parent born ${ERA_CUTOFF_YEAR}+)`;

  return { era, region: resolvedRegion, titles, note, parentBirthYearEstimate: parentBirthYear };
}

/**
 * Build a presentation-ready list of specific candidates from the
 * top-N domain ranking.
 *
 * @param {Array} topDomains - the `top` array from rankParentProfessions
 * @param {object} ctx       - same as specificTitlesForDomain
 * @returns {Array<{ domain, score, titles, era, region }>}
 */
function expandToSpecificTitles(topDomains, ctx = {}) {
  if (!Array.isArray(topDomains)) return [];
  return topDomains.slice(0, 3).map((d) => {
    const sp = specificTitlesForDomain(d.occupation, ctx);
    return {
      domain: d.occupation,
      score: d.score,
      era: sp.era,
      region: sp.region,
      specificTitles: sp.titles.slice(0, 4),
    };
  });
}

module.exports = {
  specificTitlesForDomain,
  expandToSpecificTitles,
  ERA_CUTOFF_YEAR,
  SPECIFIC_CATALOG,
  REGION_OVERRIDES,
};
