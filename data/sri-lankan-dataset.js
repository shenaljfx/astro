/**
 * Sri Lankan Personalities - Life Events Validation Dataset
 * =========================================================
 * 
 * Purpose: Validate Grahachara astrology predictions against documented
 * life events of well-known Sri Lankan personalities.
 * 
 * Data Sources:
 * - Birth dates & places: Wikipedia (verified, public record)
 * - Life events: Wikipedia, ESPNcricinfo, news archives
 * - Birth times: AstroSage where available (rated), otherwise marked 'unknown'
 *   When birth time is unknown, 12:00 noon is used as placeholder (standard practice)
 *   and birthTimeSource is marked accordingly.
 * 
 * Dataset Structure (inspired by VedAstro LifeEvent model):
 * - Each person has: name, birthDate (ISO), birthTime (HH:MM), birthPlace,
 *   lat/lng, gender, religion, birthTimeSource, lifeEvents[]
 * - Each lifeEvent: { name, date, category, nature (Good/Neutral/Bad),
 *   weight (Major/Normal/Minor), description, astrologyRelevance }
 * 
 * Categories: career, marriage, children, health, death, awards, 
 *             legal, travel, education, spiritual, financial, political
 * 
 * Astrology Relevance: Maps events to Vedic astrology houses/significations
 *   - Marriage → 7th house, Venus, Jupiter
 *   - Career peak → 10th house, Sun, Saturn
 *   - Children → 5th house, Jupiter
 *   - Health crisis → 6th/8th house, Saturn, Mars
 *   - Awards/Fame → 10th/11th house, Sun, Jupiter
 *   - Legal trouble → 6th/12th house, Saturn, Rahu
 *   - Travel abroad → 9th/12th house, Rahu
 *   - Death/loss → 8th house, Saturn, Ketu
 * 
 * IMPORTANT: This dataset is for research and validation purposes only.
 * Birth times marked as 'unknown' use 12:00 noon placeholder.
 * Results for those charts should focus on date-level predictions
 * (Dasha periods, transits) rather than house/lagna-dependent readings.
 */

const SRI_LANKAN_DATASET = [

  // ============================================================
  // 1. KUMAR SANGAKKARA - Cricket Legend
  // ============================================================
  {
    id: 'sangakkara',
    name: 'Kumar Chokshanada Sangakkara',
    birthDate: '1977-10-27',
    birthTime: '12:00',
    birthPlace: 'Matale, Sri Lanka',
    lat: 7.4675,
    lng: 80.6234,
    gender: 'male',
    religion: 'Buddhist',
    birthTimeSource: 'unknown (AstroSage: Dirty Data, noon placeholder)',
    profession: 'Cricketer / Lawyer',
    notes: 'Left-handed batsman, wicket-keeper. One of the greatest cricketers of all time. Also trained as a lawyer at University of Colombo.',

    lifeEvents: [
      {
        name: 'International Cricket Debut (ODI)',
        date: '2000-07-05',
        category: 'career',
        nature: 'Good',
        weight: 'Major',
        description: 'Made ODI debut for Sri Lanka vs Pakistan',
        astrologyRelevance: '10th house activation, Dasha period favorable for career launch'
      },
      {
        name: 'Test Cricket Debut',
        date: '2000-07-20',
        category: 'career',
        nature: 'Good',
        weight: 'Major',
        description: 'Made Test debut vs South Africa at Galle',
        astrologyRelevance: '10th house, Jupiter transit'
      },
      {
        name: 'Record Partnership (624 runs)',
        date: '2006-07-27',
        category: 'career',
        nature: 'Good',
        weight: 'Major',
        description: 'World record partnership of 624 runs with Mahela Jayawardene vs South Africa, highest ever in first-class cricket',
        astrologyRelevance: '10th/11th house peak, Jupiter-Sun favorable'
      },
      {
        name: 'Marriage to Yehali',
        date: '2003-02-01',
        endDate: null,
        category: 'marriage',
        nature: 'Good',
        weight: 'Major',
        description: 'Married Yehali Sangakkara. Lasting marriage.',
        astrologyRelevance: '7th house, Venus period'
      },
      {
        name: 'Lahore Terrorist Attack - Survived',
        date: '2009-03-03',
        category: 'health',
        nature: 'Bad',
        weight: 'Major',
        description: 'Sri Lankan cricket team bus attacked by 12 gunmen in Lahore, Pakistan. Sangakkara was hit by shrapnel in his shoulder. 6 policemen and 2 civilians killed.',
        astrologyRelevance: '8th house activation (near-death), Mars-Saturn transit, Rahu involvement'
      },
      {
        name: 'Appointed Sri Lanka Captain',
        date: '2009-03-01',
        category: 'career',
        nature: 'Good',
        weight: 'Major',
        description: 'Appointed captain of Sri Lanka cricket team in all formats',
        astrologyRelevance: '10th house peak, Sun-Jupiter'
      },
      {
        name: 'Twins Born',
        date: '2009-01-01',
        category: 'children',
        nature: 'Good',
        weight: 'Major',
        description: 'Wife Yehali gave birth to twins (approximate date, 2009)',
        astrologyRelevance: '5th house, Jupiter transit'
      },
      {
        name: 'ICC Cricketer of the Year',
        date: '2012-09-15',
        category: 'awards',
        nature: 'Good',
        weight: 'Major',
        description: 'Won ICC Cricketer of the Year award',
        astrologyRelevance: '10th/11th house, Sun prominence'
      },
      {
        name: 'Ministry of Crab Restaurant Opening',
        date: '2011-12-01',
        category: 'financial',
        nature: 'Good',
        weight: 'Normal',
        description: 'Co-founded Ministry of Crab restaurant with Mahela Jayawardene in Colombo. Later became internationally acclaimed.',
        astrologyRelevance: '2nd/11th house (wealth), Venus-Mercury'
      },
      {
        name: 'Retirement from International Cricket',
        date: '2015-08-15',
        category: 'career',
        nature: 'Neutral',
        weight: 'Major',
        description: 'Retired from all international cricket after a legendary career',
        astrologyRelevance: 'Saturn return/transit, end of career Dasha'
      },
      {
        name: 'UN Anti-Narcotics Ambassador',
        date: '2015-01-01',
        category: 'career',
        nature: 'Good',
        weight: 'Normal',
        description: 'Appointed UN Anti-Narcotics Ambassador for Sri Lanka',
        astrologyRelevance: '9th/10th house, Jupiter-Saturn'
      },
      {
        name: 'MCC President',
        date: '2019-10-01',
        category: 'career',
        nature: 'Good',
        weight: 'Major',
        description: 'Became President of Marylebone Cricket Club (MCC), first non-British person to hold this position',
        astrologyRelevance: '10th house peak, foreign recognition (9th/12th house)'
      },
      {
        name: 'ICC Hall of Fame Induction',
        date: '2021-11-13',
        category: 'awards',
        nature: 'Good',
        weight: 'Major',
        description: 'Inducted into ICC Cricket Hall of Fame',
        astrologyRelevance: '10th/11th house, lasting legacy'
      }
    ]
  },

  // ============================================================
  // 2. MAHINDA RAJAPAKSA - Political Leader
  // ============================================================
  {
    id: 'rajapaksa',
    name: 'Percy Mahinda Rajapaksa',
    birthDate: '1945-11-18',
    birthTime: '12:00',
    birthPlace: 'Weeraketiya, Southern Province, Sri Lanka',
    lat: 6.2167,
    lng: 80.8833,
    gender: 'male',
    religion: 'Buddhist',
    birthTimeSource: 'unknown (noon placeholder). Note: Rajapaksa is known to consult astrologers regularly and wears astrological talismans/rings.',
    profession: 'Politician / Lawyer',
    notes: 'President of Sri Lanka 2005-2015. Prime Minister multiple times. Known to heavily consult Vedic astrologers for important decisions. Wears a lucky ring set with nine gems (navaratna).',

    lifeEvents: [
      {
        name: 'Elected to Parliament (First Time)',
        date: '1970-05-27',
        category: 'political',
        nature: 'Good',
        weight: 'Major',
        description: 'Elected to Sri Lankan Parliament at age 24, becoming youngest MP at the time',
        astrologyRelevance: '10th house, Rahu-Jupiter favorable for political rise'
      },
      {
        name: 'Marriage to Shiranthi Wickremasinghe',
        date: '1983-01-01',
        category: 'marriage',
        nature: 'Good',
        weight: 'Major',
        description: 'Married Shiranthi Wickremasinghe. They have three sons: Namal, Yoshitha, Rohitha.',
        astrologyRelevance: '7th house, Venus period'
      },
      {
        name: 'Son Namal Born',
        date: '1986-04-10',
        category: 'children',
        nature: 'Good',
        weight: 'Major',
        description: 'First son Namal Rajapaksa born (later became politician)',
        astrologyRelevance: '5th house, Jupiter'
      },
      {
        name: 'Appointed Prime Minister (First Time)',
        date: '2004-04-06',
        category: 'political',
        nature: 'Good',
        weight: 'Major',
        description: 'Appointed Prime Minister of Sri Lanka by President Kumaratunga',
        astrologyRelevance: '10th house peak, Sun-Jupiter-Saturn'
      },
      {
        name: 'Elected President of Sri Lanka',
        date: '2005-11-19',
        category: 'political',
        nature: 'Good',
        weight: 'Major',
        description: 'Won presidential election by narrow margin, became 6th Executive President of Sri Lanka',
        astrologyRelevance: '10th house Dasha lord peak, Rahu-Jupiter mahadasha'
      },
      {
        name: 'End of Civil War / Defeat of LTTE',
        date: '2009-05-19',
        category: 'political',
        nature: 'Good',
        weight: 'Major',
        description: 'Sri Lankan military defeated LTTE, ending 26-year civil war. Rajapaksa credited as wartime leader.',
        astrologyRelevance: 'Mars-Sun-Saturn favorable, 6th house (enemies defeated)'
      },
      {
        name: 'Re-elected President',
        date: '2010-01-26',
        category: 'political',
        nature: 'Good',
        weight: 'Major',
        description: 'Won second term as President with 57.88% of vote against Sarath Fonseka',
        astrologyRelevance: '10th house continued strength'
      },
      {
        name: 'Lost Presidential Election',
        date: '2015-01-09',
        category: 'political',
        nature: 'Bad',
        weight: 'Major',
        description: 'Unexpectedly lost to Maithripala Sirisena in presidential election despite calling early elections',
        astrologyRelevance: 'Saturn transit adverse, 10th house afflicted, Dasha change'
      },
      {
        name: 'Brief Appointment as PM (Constitutional Crisis)',
        date: '2018-10-26',
        category: 'political',
        nature: 'Neutral',
        weight: 'Major',
        description: 'Appointed PM by President Sirisena in controversial move, later ruled unconstitutional by Supreme Court',
        astrologyRelevance: 'Rahu-Ketu axis, legal complications (6th house)'
      },
      {
        name: 'Appointed PM Under Gotabaya',
        date: '2019-11-21',
        category: 'political',
        nature: 'Good',
        weight: 'Major',
        description: 'Appointed Prime Minister after brother Gotabaya won presidential election',
        astrologyRelevance: '10th house revival, family support (4th house)'
      },
      {
        name: 'Forced Resignation - Mass Protests',
        date: '2022-05-09',
        category: 'political',
        nature: 'Bad',
        weight: 'Major',
        description: 'Resigned as PM amid Aragalaya mass protests and economic crisis. Residence set on fire by protesters.',
        astrologyRelevance: 'Saturn-Rahu adverse, 8th house transformation, 12th house losses'
      }
    ]
  },

  // ============================================================
  // 3. MUTTIAH MURALITHARAN - Cricket Legend
  // ============================================================
  {
    id: 'muralitharan',
    name: 'Muttiah Muralitharan',
    birthDate: '1972-04-17',
    birthTime: '12:00',
    birthPlace: 'Kandy, Sri Lanka',
    lat: 7.2906,
    lng: 80.6337,
    gender: 'male',
    religion: 'Hindu',
    birthTimeSource: 'unknown (noon placeholder)',
    profession: 'Cricketer',
    notes: 'Hill Country Tamil. Highest wicket-taker in Test cricket history (800 wickets) and ODI history (534 wickets). Off-spin bowler with controversial action.',

    lifeEvents: [
      {
        name: 'Test Cricket Debut',
        date: '1992-08-28',
        category: 'career',
        nature: 'Good',
        weight: 'Major',
        description: 'Made Test debut vs Australia at Colombo',
        astrologyRelevance: '10th house activation'
      },
      {
        name: 'No-Ball Controversy (Darrell Hair)',
        date: '1995-12-26',
        category: 'career',
        nature: 'Bad',
        weight: 'Major',
        description: 'Called for throwing 7 times by umpire Darrell Hair during Boxing Day Test in Melbourne. Traumatic experience that nearly ended career.',
        astrologyRelevance: 'Saturn-Rahu affliction, 6th house (enemies), Ketu (controversy)'
      },
      {
        name: 'Survived 2004 Tsunami',
        date: '2004-12-26',
        category: 'health',
        nature: 'Bad',
        weight: 'Major',
        description: 'Narrowly survived the Indian Ocean tsunami while at a hotel in Sri Lanka',
        astrologyRelevance: '8th house (near-death), Ketu involvement'
      },
      {
        name: 'Marriage to Madhimalar Ramamurthy',
        date: '2005-03-21',
        category: 'marriage',
        nature: 'Good',
        weight: 'Major',
        description: 'Married Madhimalar Ramamurthy, a Chennai native. Wedding in Chennai.',
        astrologyRelevance: '7th house, Venus-Jupiter, foreign spouse connection (12th)'
      },
      {
        name: 'Son Naren Born',
        date: '2006-01-15',
        category: 'children',
        nature: 'Good',
        weight: 'Major',
        description: 'Son Naren Muralitharan born (approximate date)',
        astrologyRelevance: '5th house, Jupiter transit'
      },
      {
        name: '800th Test Wicket (World Record)',
        date: '2010-07-22',
        category: 'career',
        nature: 'Good',
        weight: 'Major',
        description: 'Took his 800th Test wicket (Pragyan Ojha) in final Test match vs India at Galle. All-time record.',
        astrologyRelevance: '10th/11th house peak, Sun-Jupiter-Mercury'
      },
      {
        name: 'Retirement from Test Cricket',
        date: '2010-07-22',
        category: 'career',
        nature: 'Neutral',
        weight: 'Major',
        description: 'Retired from Test cricket after taking 800th wicket',
        astrologyRelevance: 'Saturn transit, career cycle completion'
      },
      {
        name: 'Retirement from All Cricket',
        date: '2011-07-01',
        category: 'career',
        nature: 'Neutral',
        weight: 'Major',
        description: 'Retired from all forms of international cricket',
        astrologyRelevance: 'Saturn return period'
      },
      {
        name: 'Foundation of Goodness Charity Work',
        date: '2005-01-01',
        category: 'spiritual',
        nature: 'Good',
        weight: 'Normal',
        description: 'Active involvement with Foundation of Goodness, helping tsunami-affected communities in southern Sri Lanka',
        astrologyRelevance: '9th/12th house (charity, service), Jupiter-Ketu'
      },
      {
        name: 'Biopic Film "800" Released',
        date: '2023-12-01',
        category: 'career',
        nature: 'Good',
        weight: 'Normal',
        description: 'Biographical film "800" about his life and career released',
        astrologyRelevance: '5th house (creativity), Jupiter'
      },
      {
        name: 'Obtained Indian OCI Card',
        date: '2020-01-01',
        category: 'travel',
        nature: 'Good',
        weight: 'Normal',
        description: 'Obtained Overseas Citizen of India (OCI) card due to wife being Indian citizen',
        astrologyRelevance: '12th house (foreign connections), Rahu'
      }
    ]
  },

  // ============================================================
  // 4. SANATH JAYASURIYA - Cricket Legend / Politician
  // ============================================================
  {
    id: 'jayasuriya',
    name: 'Sanath Teran Jayasuriya',
    birthDate: '1969-06-30',
    birthTime: '12:00',
    birthPlace: 'Matara, Sri Lanka',
    lat: 5.9549,
    lng: 80.5550,
    gender: 'male',
    religion: 'Buddhist',
    birthTimeSource: 'unknown (noon placeholder)',
    profession: 'Cricketer / Politician',
    notes: '1996 World Cup hero. Aggressive opening batsman who revolutionized ODI cricket. Later became MP. Multiple marriages.',

    lifeEvents: [
      {
        name: 'International Debut (ODI)',
        date: '1989-12-26',
        category: 'career',
        nature: 'Good',
        weight: 'Major',
        description: 'Made ODI debut for Sri Lanka vs Australia',
        astrologyRelevance: '10th house activation'
      },
      {
        name: '1996 World Cup - Man of the Series',
        date: '1996-03-17',
        category: 'career',
        nature: 'Good',
        weight: 'Major',
        description: 'Sri Lanka won the 1996 Cricket World Cup. Jayasuriya was named Man of the Series for his explosive batting that revolutionized opening batting in ODIs.',
        astrologyRelevance: '10th/11th house peak, Jupiter-Sun exalted'
      },
      {
        name: 'First Marriage (Sumudu)',
        date: '1998-01-01',
        category: 'marriage',
        nature: 'Good',
        weight: 'Major',
        description: 'First marriage to Sumudu. Marriage ended in 1999.',
        astrologyRelevance: '7th house, Venus'
      },
      {
        name: 'First Divorce',
        date: '1999-01-01',
        category: 'marriage',
        nature: 'Bad',
        weight: 'Major',
        description: 'Divorce from first wife Sumudu after about one year',
        astrologyRelevance: '7th house affliction, Venus-Saturn'
      },
      {
        name: 'Second Marriage (Sandra)',
        date: '2000-01-01',
        category: 'marriage',
        nature: 'Good',
        weight: 'Major',
        description: 'Married Sandra De Silva. Had three children together.',
        astrologyRelevance: '7th house, Venus activation again'
      },
      {
        name: 'Appointed Sri Lanka Captain',
        date: '1999-04-01',
        category: 'career',
        nature: 'Good',
        weight: 'Major',
        description: 'Appointed captain of Sri Lanka cricket team',
        astrologyRelevance: '10th house, Sun-Jupiter'
      },
      {
        name: 'Second Divorce',
        date: '2012-01-01',
        category: 'marriage',
        nature: 'Bad',
        weight: 'Major',
        description: 'Divorce from Sandra after 12 years, custody dispute over three children',
        astrologyRelevance: '7th house affliction pattern, Venus-Rahu'
      },
      {
        name: 'Third Marriage (Maleeka)',
        date: '2012-06-01',
        category: 'marriage',
        nature: 'Good',
        weight: 'Normal',
        description: 'Married Maleeka Sirisenage. Marriage reportedly ended the same year.',
        astrologyRelevance: '7th house repeated activation, Venus-Ketu'
      },
      {
        name: 'Elected Member of Parliament',
        date: '2010-04-08',
        category: 'political',
        nature: 'Good',
        weight: 'Major',
        description: 'Elected to Sri Lankan Parliament for Matara district on UPFA ticket',
        astrologyRelevance: '10th house new career, Sun-Rahu'
      },
      {
        name: 'Appointed Deputy Minister',
        date: '2010-06-01',
        category: 'political',
        nature: 'Good',
        weight: 'Normal',
        description: 'Appointed Deputy Minister of Postal Services & Telecommunications',
        astrologyRelevance: '10th house elevation'
      },
      {
        name: 'ICC Two-Year Ban (Anti-Corruption)',
        date: '2019-02-28',
        category: 'legal',
        nature: 'Bad',
        weight: 'Major',
        description: 'Banned for two years by ICC for refusing to cooperate with Anti-Corruption Unit investigation. Failed to hand over devices.',
        astrologyRelevance: 'Saturn-Rahu adverse, 6th/12th house (legal, hidden matters)'
      },
      {
        name: 'Knee Replacement Surgery',
        date: '2017-01-01',
        category: 'health',
        nature: 'Bad',
        weight: 'Normal',
        description: 'Underwent knee replacement surgery, result of years of cricket',
        astrologyRelevance: '6th house (health), Saturn (bones/joints)'
      },
      {
        name: 'Appointed Sri Lanka Cricket Coach',
        date: '2024-03-01',
        category: 'career',
        nature: 'Good',
        weight: 'Normal',
        description: 'Appointed as head coach of Sri Lanka national cricket team',
        astrologyRelevance: '10th house revival'
      }
    ]
  },

  // ============================================================
  // 5. MAHELA JAYAWARDENE - Cricket Legend
  // ============================================================
  {
    id: 'jayawardene',
    name: 'Denagamage Proboth Mahela de Silva Jayawardene',
    birthDate: '1977-05-27',
    birthTime: '12:00',
    birthPlace: 'Colombo, Sri Lanka',
    lat: 6.9271,
    lng: 79.8612,
    gender: 'male',
    religion: 'Buddhist',
    birthTimeSource: 'unknown (noon placeholder)',
    profession: 'Cricketer / Coach / Businessman',
    notes: 'Right-handed batsman. First Sri Lankan to score 10,000 Test runs. Highest Test score by a Sri Lankan (374). Captain who led SL to 2007 WC final, 2012 T20 WC final. Co-owner of Ministry of Crab restaurant with Sangakkara.',

    lifeEvents: [
      {
        name: 'Test Cricket Debut',
        date: '1997-08-02',
        category: 'career',
        nature: 'Good',
        weight: 'Major',
        description: 'Made Test debut vs India at Colombo in the record-breaking 952/6 Test',
        astrologyRelevance: '10th house activation'
      },
      {
        name: 'Record Score 374 vs South Africa',
        date: '2006-07-27',
        category: 'career',
        nature: 'Good',
        weight: 'Major',
        description: 'Scored 374, highest Test score by a Sri Lankan and 4th highest in Test history. Record partnership of 624 with Sangakkara.',
        astrologyRelevance: '10th/11th house peak, Sun-Jupiter exalted'
      },
      {
        name: 'Appointed Sri Lanka Captain',
        date: '2006-05-01',
        category: 'career',
        nature: 'Good',
        weight: 'Major',
        description: 'Appointed captain for England tour in absence of Atapattu, later full-time captain',
        astrologyRelevance: '10th house, Sun prominence'
      },
      {
        name: 'ICC Captain of the Year',
        date: '2006-11-03',
        category: 'awards',
        nature: 'Good',
        weight: 'Major',
        description: 'Named ICC Captain of the Year 2006',
        astrologyRelevance: '10th/11th house, Sun-Jupiter'
      },
      {
        name: 'Wisden Cricketer of the Year',
        date: '2007-04-01',
        category: 'awards',
        nature: 'Good',
        weight: 'Major',
        description: 'Named Wisden Cricketer of the Year 2007',
        astrologyRelevance: '10th/11th house continued'
      },
      {
        name: 'Lahore Terrorist Attack - Injured',
        date: '2009-03-03',
        category: 'health',
        nature: 'Bad',
        weight: 'Major',
        description: 'Injured along with 6 other Sri Lankan cricketers when team bus was attacked by 12 gunmen in Lahore. 6 policemen killed.',
        astrologyRelevance: '8th house (near-death), Mars-Rahu'
      },
      {
        name: 'Marriage to Christina Sirisena',
        date: '2003-01-01',
        category: 'marriage',
        nature: 'Good',
        weight: 'Major',
        description: 'Married Christina Mallika Sirisena, a travel consultant. Had daughter Sansa Arya.',
        astrologyRelevance: '7th house, Venus'
      },
      {
        name: 'Brother Dhishal Death (Brain Tumour)',
        date: '1993-01-01',
        category: 'death',
        nature: 'Bad',
        weight: 'Major',
        description: 'Younger brother Dhishal died of brain tumour aged 16. Deeply affected Jayawardene, halting cricket career temporarily.',
        astrologyRelevance: '8th house (death of sibling), 3rd house (siblings), Saturn-Ketu'
      },
      {
        name: '103* in 2011 World Cup Final',
        date: '2011-04-02',
        category: 'career',
        nature: 'Good',
        weight: 'Major',
        description: 'Scored unbeaten 103 in World Cup Final vs India at Mumbai, though Sri Lanka lost',
        astrologyRelevance: '10th house, Sun exalted'
      },
      {
        name: 'First Sri Lankan to 10,000 Test Runs',
        date: '2011-12-26',
        category: 'career',
        nature: 'Good',
        weight: 'Major',
        description: 'Became first Sri Lankan to score 10,000 Test runs during South Africa tour',
        astrologyRelevance: '10th/11th house, Jupiter'
      },
      {
        name: 'ICC Spirit of Cricket Award',
        date: '2013-12-13',
        category: 'awards',
        nature: 'Good',
        weight: 'Normal',
        description: 'Won ICC Spirit of Cricket Award 2013',
        astrologyRelevance: '9th house (dharma/ethics), Jupiter'
      },
      {
        name: 'Retirement from Test Cricket',
        date: '2014-08-14',
        category: 'career',
        nature: 'Neutral',
        weight: 'Major',
        description: 'Retired from Test cricket at SSC ground after Pakistan series',
        astrologyRelevance: 'Saturn transit, Dasha change'
      },
      {
        name: 'Won T20 World Cup with Sri Lanka',
        date: '2014-04-06',
        category: 'career',
        nature: 'Good',
        weight: 'Major',
        description: 'Part of Sri Lanka team that won 2014 T20 World Cup, defeating India in final. Last T20I match.',
        astrologyRelevance: '10th/11th house, career culmination'
      },
      {
        name: 'Divorce from Christina',
        date: '2018-01-01',
        category: 'marriage',
        nature: 'Bad',
        weight: 'Major',
        description: 'Divorced first wife Christina Sirisena',
        astrologyRelevance: '7th house affliction, Saturn-Venus'
      },
      {
        name: 'Second Marriage to Natasha Makalanda',
        date: '2021-01-01',
        category: 'marriage',
        nature: 'Good',
        weight: 'Major',
        description: 'Married Natasha Makalanda',
        astrologyRelevance: '7th house re-activation, Venus-Jupiter'
      },
      {
        name: 'ICC Hall of Fame Induction',
        date: '2021-11-13',
        category: 'awards',
        nature: 'Good',
        weight: 'Major',
        description: 'Inducted into ICC Cricket Hall of Fame along with Sangakkara',
        astrologyRelevance: '10th/11th house, permanent legacy'
      },
      {
        name: 'Chairman of National Sports Council',
        date: '2020-08-01',
        category: 'career',
        nature: 'Good',
        weight: 'Normal',
        description: 'Appointed Chairman of Sri Lanka National Sports Council',
        astrologyRelevance: '10th house new role, Jupiter-Saturn'
      }
    ]
  },

  // ============================================================
  // 6. LASITH MALINGA - Cricket Legend
  // ============================================================
  {
    id: 'malinga',
    name: 'Separamadu Lasith Malinga',
    birthDate: '1983-08-28',
    birthTime: '12:00',
    birthPlace: 'Galle, Sri Lanka',
    lat: 6.0535,
    lng: 80.2210,
    gender: 'male',
    religion: 'Buddhist',
    birthTimeSource: 'unknown (noon placeholder)',
    profession: 'Cricketer / Coach / Singer',
    notes: 'Fast bowler known as "Slinga Malinga" for round-arm action. Highest wicket-taker in T20I history. From humble background in Rathgama fishing village.',

    lifeEvents: [
      {
        name: 'International Debut (ODI)',
        date: '2004-07-17',
        category: 'career',
        nature: 'Good',
        weight: 'Major',
        description: 'Made ODI debut vs UAE in Asia Cup',
        astrologyRelevance: '10th house activation'
      },
      {
        name: 'Test Debut',
        date: '2004-07-01',
        category: 'career',
        nature: 'Good',
        weight: 'Major',
        description: 'Made Test debut vs Australia at Darwin',
        astrologyRelevance: '10th house'
      },
      {
        name: 'Four Wickets in Four Balls (World Record)',
        date: '2007-03-28',
        category: 'career',
        nature: 'Good',
        weight: 'Major',
        description: 'Took 4 wickets in 4 consecutive balls vs South Africa in 2007 World Cup, first in ODI history',
        astrologyRelevance: '10th/11th house peak, Mars-Jupiter'
      },
      {
        name: 'Marriage to Tanya Perera',
        date: '2010-01-01',
        category: 'marriage',
        nature: 'Good',
        weight: 'Major',
        description: 'Married Tanya Perera',
        astrologyRelevance: '7th house, Venus'
      },
      {
        name: 'Retired from Test Cricket',
        date: '2011-04-22',
        category: 'career',
        nature: 'Neutral',
        weight: 'Major',
        description: 'Announced retirement from Test cricket to prolong limited-overs career',
        astrologyRelevance: 'Saturn transit, strategic career shift'
      },
      {
        name: 'Led Sri Lanka to 2014 T20 World Cup Title',
        date: '2014-04-06',
        category: 'career',
        nature: 'Good',
        weight: 'Major',
        description: 'Captained Sri Lanka to victory in 2014 ICC World Twenty20 after Chandimal was banned',
        astrologyRelevance: '10th house peak, Sun-Mars'
      },
      {
        name: 'Severe Knee Injury Period',
        date: '2016-03-01',
        category: 'health',
        nature: 'Bad',
        weight: 'Major',
        description: 'Multiple knee injuries forced him out of cricket for over a year. Stepped down from captaincy.',
        astrologyRelevance: '6th house (health), Saturn (bones/joints), Mars'
      },
      {
        name: 'Dengue Illness',
        date: '2016-12-01',
        category: 'health',
        nature: 'Bad',
        weight: 'Normal',
        description: 'Contracted dengue fever, missed South Africa tour',
        astrologyRelevance: '6th house affliction'
      },
      {
        name: '100th T20I Wicket (World First)',
        date: '2019-09-01',
        category: 'career',
        nature: 'Good',
        weight: 'Major',
        description: 'Became first cricketer to take 100 wickets in T20 Internationals',
        astrologyRelevance: '10th/11th house, Mars peak'
      },
      {
        name: 'IPL 2019 Final - Winning Last Ball Wicket',
        date: '2019-05-12',
        category: 'career',
        nature: 'Good',
        weight: 'Major',
        description: 'Took wicket on last ball of 2019 IPL Final for Mumbai Indians, winning by 1 run vs Chennai Super Kings',
        astrologyRelevance: '10th house, Mars-Mercury-Jupiter'
      },
      {
        name: 'Retirement from All Cricket',
        date: '2021-09-14',
        category: 'career',
        nature: 'Neutral',
        weight: 'Major',
        description: 'Announced retirement from all forms of cricket via YouTube. Ended with 107 T20I wickets (record at time).',
        astrologyRelevance: 'Saturn transit, career completion'
      },
      {
        name: 'Music Career Launch',
        date: '2023-01-01',
        category: 'career',
        nature: 'Good',
        weight: 'Normal',
        description: 'Released debut music album "Life", began songwriting career in Sinhala and Hindi',
        astrologyRelevance: '5th house (creativity), Venus-Mercury'
      }
    ]
  },

  // ============================================================
  // 7. ARAVINDA DE SILVA - Cricket Legend
  // ============================================================
  {
    id: 'desilva',
    name: 'Pinnaduwage Aravinda de Silva',
    birthDate: '1965-10-17',
    birthTime: '12:00',
    birthPlace: 'Colombo, Sri Lanka',
    lat: 6.9271,
    lng: 79.8612,
    gender: 'male',
    religion: 'Buddhist',
    birthTimeSource: 'unknown (noon placeholder)',
    profession: 'Cricketer / Administrator',
    notes: 'Nicknamed "Mad Max". Key member of 1996 World Cup winning team. Man of the Match in World Cup Final. ICC Hall of Fame 2023.',

    lifeEvents: [
      {
        name: 'Test Cricket Debut',
        date: '1984-08-23',
        category: 'career',
        nature: 'Good',
        weight: 'Major',
        description: 'Made Test debut at Lord\'s vs England at age 18',
        astrologyRelevance: '10th house activation at young age'
      },
      {
        name: '1996 World Cup Final - Man of the Match',
        date: '1996-03-17',
        category: 'career',
        nature: 'Good',
        weight: 'Major',
        description: 'Took 3/42 and scored 107* in World Cup Final vs Australia at Lahore. Only player to score 100 and take 3+ wickets in a World Cup final.',
        astrologyRelevance: '10th/11th house peak, Sun-Jupiter-Mars'
      },
      {
        name: 'County Cricket with Kent (Career Turning Point)',
        date: '1995-04-01',
        category: 'career',
        nature: 'Good',
        weight: 'Major',
        description: 'Season with Kent CCC marked turning point in career. 3rd most prolific batsman in County Championship with 1661 runs, highest score of season (255).',
        astrologyRelevance: '10th house, 12th house (foreign land), Jupiter transit'
      },
      {
        name: 'Wisden Cricketer of the Year',
        date: '1996-04-01',
        category: 'awards',
        nature: 'Good',
        weight: 'Major',
        description: 'Named Wisden Cricketer of the Year 1996',
        astrologyRelevance: '10th/11th house, Sun-Jupiter'
      },
      {
        name: 'Two Unbeaten Centuries in Same Test (World First)',
        date: '1997-04-01',
        category: 'career',
        nature: 'Good',
        weight: 'Major',
        description: 'Scored 138* and 103* vs Pakistan at SSC, becoming first (and still only) player to score two unbeaten centuries in same Test match',
        astrologyRelevance: '10th house, Sun-Mercury-Jupiter'
      },
      {
        name: 'Match Fixing Allegations (Cleared)',
        date: '2001-01-01',
        category: 'legal',
        nature: 'Bad',
        weight: 'Major',
        description: 'Investigated for match fixing allegations by local inquiry. MK Gupta claimed payments. De Silva denied. Cleared after Gupta failed to testify.',
        astrologyRelevance: 'Rahu-Saturn adverse, 6th/12th house'
      },
      {
        name: 'Retirement from International Cricket',
        date: '2003-03-18',
        category: 'career',
        nature: 'Neutral',
        weight: 'Major',
        description: 'Retired after 2003 World Cup semi-final vs Australia. Took wicket with final delivery in Test cricket.',
        astrologyRelevance: 'Saturn transit, career completion'
      },
      {
        name: 'Chairman of Selection Committee',
        date: '2011-01-01',
        category: 'career',
        nature: 'Good',
        weight: 'Normal',
        description: 'Appointed chairman of Sri Lanka national selection committee',
        astrologyRelevance: '10th house post-career role'
      },
      {
        name: '2011 World Cup Final Fixing Investigation',
        date: '2020-06-30',
        category: 'legal',
        nature: 'Bad',
        weight: 'Major',
        description: 'Questioned for 6 hours by anti-corruption unit about 2011 World Cup Final match fixing allegations',
        astrologyRelevance: 'Rahu-Saturn, 6th/8th house'
      },
      {
        name: 'ICC Hall of Fame Induction',
        date: '2023-11-13',
        category: 'awards',
        nature: 'Good',
        weight: 'Major',
        description: 'Inducted into ICC Cricket Hall of Fame, 4th Sri Lankan to receive the honor',
        astrologyRelevance: '10th/11th house, permanent legacy'
      }
    ]
  },

  // ============================================================
  // 8. SIRIMAVO BANDARANAIKE - Political Pioneer
  // ============================================================
  {
    id: 'bandaranaike',
    name: 'Sirima Ratwatte Dias Bandaranaike',
    birthDate: '1916-04-17',
    birthTime: '12:00',
    birthPlace: 'Ratnapura, Sri Lanka',
    lat: 6.6828,
    lng: 80.3992,
    gender: 'female',
    religion: 'Buddhist',
    birthTimeSource: 'unknown (noon placeholder)',
    profession: 'Politician / Prime Minister',
    notes: 'World\'s first female Prime Minister (1960). Served three terms as PM of Sri Lanka (1960-65, 1970-77, 1994-2000). From aristocratic Kandyan Ratwatte family. Marriage arranged after astrologers confirmed horoscope compatibility.',

    lifeEvents: [
      {
        name: 'Marriage to S.W.R.D. Bandaranaike',
        date: '1940-10-02',
        category: 'marriage',
        nature: 'Good',
        weight: 'Major',
        description: 'Married Solomon Bandaranaike at Mahawelatenne Walawwa. Dubbed "wedding of the century". Astrologers confirmed horoscope compatibility before marriage.',
        astrologyRelevance: '7th house, Venus-Jupiter. Notably: the marriage was specifically arranged based on astrological compatibility.'
      },
      {
        name: 'Daughter Sunethra Born',
        date: '1943-01-01',
        category: 'children',
        nature: 'Good',
        weight: 'Major',
        description: 'First daughter Sunethra born at Wendtworth, Colombo',
        astrologyRelevance: '5th house, Jupiter'
      },
      {
        name: 'Daughter Chandrika Born',
        date: '1945-06-29',
        category: 'children',
        nature: 'Good',
        weight: 'Major',
        description: 'Second daughter Chandrika born (later became President of Sri Lanka)',
        astrologyRelevance: '5th house, Jupiter-Venus'
      },
      {
        name: 'Son Anura Born',
        date: '1949-01-01',
        category: 'children',
        nature: 'Good',
        weight: 'Major',
        description: 'Son Anura born at Tintagel, Colombo (later became Speaker of Parliament)',
        astrologyRelevance: '5th house, Jupiter'
      },
      {
        name: 'Husband Assassinated',
        date: '1959-09-25',
        category: 'death',
        nature: 'Bad',
        weight: 'Major',
        description: 'Husband S.W.R.D. Bandaranaike shot by Buddhist monk Talduwe Somarama, died next day. Bandaranaike was at home in Rosmead Place.',
        astrologyRelevance: '7th house lord afflicted (spouse death), 8th house, Mars-Saturn-Ketu'
      },
      {
        name: 'Elected First Female PM in World History',
        date: '1960-07-21',
        category: 'political',
        nature: 'Good',
        weight: 'Major',
        description: 'Became world\'s first female Prime Minister after SLFP won July 1960 elections. Historic global milestone.',
        astrologyRelevance: '10th house massive activation, Rahu (breaking convention), Jupiter-Sun'
      },
      {
        name: 'Lost 1965 Election',
        date: '1965-03-25',
        category: 'political',
        nature: 'Bad',
        weight: 'Major',
        description: 'Lost power in 1965 general election to Dudley Senanayake\'s UNP',
        astrologyRelevance: '10th house afflicted, Saturn adverse transit'
      },
      {
        name: 'Second Term as PM',
        date: '1970-05-29',
        category: 'political',
        nature: 'Good',
        weight: 'Major',
        description: 'Re-elected as PM with United Front coalition winning landslide victory',
        astrologyRelevance: '10th house re-activation, Jupiter return'
      },
      {
        name: 'Ceylon Becomes Republic of Sri Lanka',
        date: '1972-05-22',
        category: 'political',
        nature: 'Good',
        weight: 'Major',
        description: 'Under her leadership, Ceylon became the Republic of Sri Lanka with new constitution. Queen Elizabeth no longer sovereign.',
        astrologyRelevance: '10th house peak, Sun-Jupiter (sovereignty)'
      },
      {
        name: 'Stripped of Civil Rights',
        date: '1980-10-16',
        category: 'legal',
        nature: 'Bad',
        weight: 'Major',
        description: 'Civil liberties stripped for 7 years by J.R. Jayewardene government for alleged abuse of power. Expelled from parliament.',
        astrologyRelevance: 'Saturn-Rahu, 12th house (confinement/loss), 6th house (enemies)'
      },
      {
        name: 'Civil Rights Restored',
        date: '1986-01-01',
        category: 'legal',
        nature: 'Good',
        weight: 'Major',
        description: 'Civil rights restored by presidential decree of Jayewardene',
        astrologyRelevance: 'Jupiter transit favorable, 12th house release'
      },
      {
        name: 'Lost 1988 Presidential Election',
        date: '1988-12-19',
        category: 'political',
        nature: 'Bad',
        weight: 'Major',
        description: 'Narrowly lost presidential election to Ranasinghe Premadasa',
        astrologyRelevance: 'Saturn adverse, 10th house afflicted'
      },
      {
        name: 'Suffered Stroke',
        date: '1991-01-01',
        category: 'health',
        nature: 'Bad',
        weight: 'Major',
        description: 'Suffered a stroke while increasingly impaired by arthritis',
        astrologyRelevance: '6th/8th house, Saturn-Mars'
      },
      {
        name: 'Third Term as PM',
        date: '1994-11-14',
        category: 'political',
        nature: 'Good',
        weight: 'Major',
        description: 'Appointed PM for third time by daughter Chandrika Kumaratunga who won presidency',
        astrologyRelevance: '10th house late revival, 5th house (children elevating parent)'
      },
      {
        name: 'Resigned as PM',
        date: '2000-08-10',
        category: 'political',
        nature: 'Neutral',
        weight: 'Major',
        description: 'Resigned as PM due to declining health at age 84',
        astrologyRelevance: 'Saturn-Mars health decline, Dasha ending'
      },
      {
        name: 'Death',
        date: '2000-10-10',
        category: 'death',
        nature: 'Bad',
        weight: 'Major',
        description: 'Died of heart attack at Kadawatha while heading home after casting vote in parliamentary election. Sri Lanka declared 2 days national mourning.',
        astrologyRelevance: '8th house, Mars-Saturn-Ketu, death while performing civic duty'
      }
    ]
  }
];

// ============================================================
// DATASET STATISTICS & METADATA
// ============================================================
const DATASET_META = {
  version: '1.0.0',
  created: '2025-03-27',
  totalPersons: SRI_LANKAN_DATASET.length,
  totalEvents: SRI_LANKAN_DATASET.reduce((sum, p) => sum + p.lifeEvents.length, 0),
  categories: {
    cricketers: ['sangakkara', 'muralitharan', 'jayasuriya', 'jayawardene', 'malinga', 'desilva'],
    politicians: ['rajapaksa', 'bandaranaike'],
    male: ['sangakkara', 'rajapaksa', 'muralitharan', 'jayasuriya', 'jayawardene', 'malinga', 'desilva'],
    female: ['bandaranaike']
  },
  eventCategories: [
    'career', 'marriage', 'children', 'health', 'death',
    'awards', 'legal', 'travel', 'education', 'spiritual',
    'financial', 'political'
  ],
  birthTimeAvailability: {
    verified: [],
    dirty: ['sangakkara'],
    unknown: ['rajapaksa', 'muralitharan', 'jayasuriya', 'jayawardene', 'malinga', 'desilva', 'bandaranaike']
  },
  notes: [
    'All birth times except Sangakkara are unknown - using 12:00 noon placeholder',
    'Sangakkara listed on AstroSage with "Dirty Data" rating (noon placeholder)',
    'Rajapaksa is documented to consult astrologers regularly - his birth time likely exists privately',
    'Bandaranaike marriage was arranged based on horoscope compatibility - charts definitely existed',
    'For validation: focus on Dasha period analysis (date-dependent, not time-dependent) for unknown birth times',
    'Events dates marked approximate where exact date unknown (typically set to month or year start)',
    'Life events sourced from Wikipedia and news archives as of March 2025'
  ]
};

// ============================================================
// HELPER: Get person by ID
// ============================================================
function getPersonById(id) {
  return SRI_LANKAN_DATASET.find(p => p.id === id);
}

// ============================================================
// HELPER: Get all events by category
// ============================================================
function getEventsByCategory(category) {
  const results = [];
  for (const person of SRI_LANKAN_DATASET) {
    for (const event of person.lifeEvents) {
      if (event.category === category) {
        results.push({ person: person.name, personId: person.id, ...event });
      }
    }
  }
  return results;
}

// ============================================================
// HELPER: Get all events by nature (Good/Bad/Neutral)
// ============================================================
function getEventsByNature(nature) {
  const results = [];
  for (const person of SRI_LANKAN_DATASET) {
    for (const event of person.lifeEvents) {
      if (event.nature === nature) {
        results.push({ person: person.name, personId: person.id, ...event });
      }
    }
  }
  return results;
}

// ============================================================
// HELPER: Get timeline for a person (sorted by date)
// ============================================================
function getTimeline(personId) {
  const person = getPersonById(personId);
  if (!person) return null;
  return {
    name: person.name,
    birth: person.birthDate,
    events: [...person.lifeEvents].sort((a, b) => new Date(a.date) - new Date(b.date))
  };
}

// ============================================================
// HELPER: Summary statistics
// ============================================================
function getDatasetSummary() {
  const summary = {
    persons: SRI_LANKAN_DATASET.length,
    totalEvents: 0,
    byCategory: {},
    byNature: { Good: 0, Bad: 0, Neutral: 0 },
    byWeight: { Major: 0, Normal: 0, Minor: 0 },
    dateRange: { earliest: '9999-12-31', latest: '0000-01-01' }
  };

  for (const person of SRI_LANKAN_DATASET) {
    for (const event of person.lifeEvents) {
      summary.totalEvents++;
      summary.byCategory[event.category] = (summary.byCategory[event.category] || 0) + 1;
      summary.byNature[event.nature] = (summary.byNature[event.nature] || 0) + 1;
      summary.byWeight[event.weight] = (summary.byWeight[event.weight] || 0) + 1;
      if (event.date < summary.dateRange.earliest) summary.dateRange.earliest = event.date;
      if (event.date > summary.dateRange.latest) summary.dateRange.latest = event.date;
    }
  }

  return summary;
}

module.exports = {
  SRI_LANKAN_DATASET,
  DATASET_META,
  getPersonById,
  getEventsByCategory,
  getEventsByNature,
  getTimeline,
  getDatasetSummary
};
