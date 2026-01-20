/**
 * Alibi Templates - Patterns for alibis in 1920s mansion mysteries
 */

export interface AlibiTemplate {
  id: string
  location: string
  activity: string
  typicalDuration: string
  verifiable: boolean
  commonFlaws: string[]
  suitableFor: string[] // character roles this alibi suits
}

export const ALIBI_TEMPLATES: AlibiTemplate[] = [
  // Private locations - harder to verify
  {
    id: 'bedroom_sleeping',
    location: 'Private bedroom',
    activity: 'Was sleeping / retired early',
    typicalDuration: 'several hours',
    verifiable: false,
    commonFlaws: [
      'No one can confirm they were actually in bed',
      'Bed was not slept in (sheets undisturbed)',
      'Heard moving around by adjacent room',
      'Light seen under door at relevant time'
    ],
    suitableFor: ['guest', 'family_member', 'anyone_tired']
  },
  {
    id: 'bedroom_headache',
    location: 'Private bedroom',
    activity: 'Had a headache / feeling unwell',
    typicalDuration: '1-2 hours',
    verifiable: false,
    commonFlaws: [
      'No medication taken (medicine cabinet untouched)',
      'Seemed perfectly fine before and after',
      'Was seen leaving room during claimed illness',
      'Doctor confirms no signs of illness'
    ],
    suitableFor: ['anyone', 'woman_of_era', 'elderly']
  },
  {
    id: 'study_reading',
    location: 'Study / Library',
    activity: 'Was reading alone',
    typicalDuration: '1-3 hours',
    verifiable: false,
    commonFlaws: [
      'Cannot recall what they were reading',
      'Book shows no sign of recent reading',
      'No one saw them in the library',
      'Library lamp was cold when checked'
    ],
    suitableFor: ['intellectual', 'businessman', 'secretary']
  },

  // Semi-private locations
  {
    id: 'garden_walking',
    location: 'Gardens',
    activity: 'Taking a walk in the gardens',
    typicalDuration: '30 minutes - 1 hour',
    verifiable: false,
    commonFlaws: [
      'Shoes show no garden soil',
      'Weather was too poor for walking',
      'Garden gate was locked',
      'No footprints in fresh snow/mud'
    ],
    suitableFor: ['romantic', 'smoker', 'restless_person']
  },
  {
    id: 'conservatory',
    location: 'Conservatory',
    activity: 'Admiring the plants / getting fresh air',
    typicalDuration: '15-45 minutes',
    verifiable: false,
    commonFlaws: [
      'Conservatory was locked at that hour',
      'No one saw them go that direction',
      'Plants were not watered as claimed',
      'Too cold in conservatory that night'
    ],
    suitableFor: ['nature_lover', 'woman', 'botanist']
  },

  // Social locations - easier to verify but times can be fuzzy
  {
    id: 'drawing_room_guests',
    location: 'Drawing room',
    activity: 'With other guests socializing',
    typicalDuration: '1-3 hours',
    verifiable: true,
    commonFlaws: [
      'Stepped out for extended period',
      'Others didn\'t notice when they left',
      'Disagreement about exact times',
      'Was distracted/distant according to others'
    ],
    suitableFor: ['socialite', 'guest', 'family_member']
  },
  {
    id: 'ballroom_dancing',
    location: 'Ballroom',
    activity: 'Dancing at the party',
    typicalDuration: 'variable',
    verifiable: true,
    commonFlaws: [
      'Dance partner can\'t account for full time',
      'Left between dances',
      'No one remembers seeing them dance',
      'Claims to have danced with someone who denies it'
    ],
    suitableFor: ['young_person', 'socialite', 'romantic']
  },
  {
    id: 'dining_room',
    location: 'Dining room',
    activity: 'At dinner / Having a late supper',
    typicalDuration: '1-2 hours',
    verifiable: true,
    commonFlaws: [
      'Left table during course',
      'Seat was empty when checked',
      'Timeline of courses doesn\'t match',
      'Staff didn\'t see them at table'
    ],
    suitableFor: ['anyone', 'guest', 'family']
  },

  // Staff alibis
  {
    id: 'kitchen_duties',
    location: 'Kitchen',
    activity: 'Performing kitchen duties',
    typicalDuration: '2-4 hours',
    verifiable: true,
    commonFlaws: [
      'Other staff didn\'t see them entire time',
      'Duties wouldn\'t take that long',
      'Kitchen inventory shows gap in work',
      'Sent on errand during critical time'
    ],
    suitableFor: ['cook', 'kitchen_staff', 'servant']
  },
  {
    id: 'butler_duties',
    location: 'Throughout house',
    activity: 'Attending to guests / butler duties',
    typicalDuration: 'all evening',
    verifiable: true,
    commonFlaws: [
      'No one remembers seeing them for a period',
      'Bell went unanswered during that time',
      'Was supposed to be in one place but wasn\'t',
      'Other staff noticed absence'
    ],
    suitableFor: ['butler', 'senior_staff']
  },
  {
    id: 'servants_quarters',
    location: 'Servants\' quarters',
    activity: 'Resting / off duty',
    typicalDuration: '1-2 hours',
    verifiable: false,
    commonFlaws: [
      'Other servants didn\'t see them',
      'Bell system shows they responded from elsewhere',
      'Was heard moving about upstairs',
      'Claimed companion wasn\'t actually there'
    ],
    suitableFor: ['servant', 'maid', 'valet']
  },

  // Special alibis
  {
    id: 'telephone_call',
    location: 'Telephone room',
    activity: 'On a long-distance telephone call',
    typicalDuration: '15-30 minutes',
    verifiable: true,
    commonFlaws: [
      'Operator has no record of call',
      'Person called denies conversation',
      'Call was much shorter than claimed',
      'Phone lines were down due to storm'
    ],
    suitableFor: ['businessman', 'anyone_expecting_call']
  },
  {
    id: 'smoking_room',
    location: 'Smoking room',
    activity: 'Having cigars and brandy',
    typicalDuration: '1-2 hours',
    verifiable: true,
    commonFlaws: [
      'Left the room during smoking session',
      'Others were too intoxicated to track time',
      'No cigar ash in their usual spot',
      'Brandy glass wasn\'t touched'
    ],
    suitableFor: ['gentleman', 'businessman', 'older_male']
  },
  {
    id: 'music_room',
    location: 'Music room',
    activity: 'Playing piano / listening to music',
    typicalDuration: '30 minutes - 1 hour',
    verifiable: false,
    commonFlaws: [
      'Piano keys were cold',
      'No one heard music from that room',
      'Sheet music wasn\'t disturbed',
      'Claims to have played piece they don\'t know'
    ],
    suitableFor: ['musician', 'artistic_person', 'woman']
  },
  {
    id: 'garage_car',
    location: 'Garage / Carriage house',
    activity: 'Checking on the automobile',
    typicalDuration: '15-30 minutes',
    verifiable: false,
    commonFlaws: [
      'Car shows no sign of being touched',
      'Chauffeur was in garage entire time',
      'Oil/grease not on hands as expected',
      'Garage was locked'
    ],
    suitableFor: ['chauffeur', 'car_enthusiast', 'young_man']
  }
]

/**
 * Get alibis suitable for a character role
 */
export function getAlibisForRole(role: string): AlibiTemplate[] {
  return ALIBI_TEMPLATES.filter(a =>
    a.suitableFor.includes(role) || a.suitableFor.includes('anyone')
  )
}

/**
 * Get alibis by verifiability
 */
export function getVerifiableAlibis(): AlibiTemplate[] {
  return ALIBI_TEMPLATES.filter(a => a.verifiable)
}

export function getUnverifiableAlibis(): AlibiTemplate[] {
  return ALIBI_TEMPLATES.filter(a => !a.verifiable)
}

/**
 * Get random alibi
 */
export function getRandomAlibi(): AlibiTemplate {
  return ALIBI_TEMPLATES[Math.floor(Math.random() * ALIBI_TEMPLATES.length)]
}

/**
 * Get alibi by location
 */
export function getAlibisByLocation(location: string): AlibiTemplate[] {
  return ALIBI_TEMPLATES.filter(a =>
    a.location.toLowerCase().includes(location.toLowerCase())
  )
}

/**
 * Generate a flawed alibi (for the killer)
 */
export function generateFlawedAlibi(template: AlibiTemplate): {
  claimed: string
  truth: string
  holes: string[]
} {
  const flaws = [...template.commonFlaws]
  // Shuffle and take 1-2 flaws
  const shuffled = flaws.sort(() => Math.random() - 0.5)
  const selectedFlaws = shuffled.slice(0, Math.floor(Math.random() * 2) + 1)

  return {
    claimed: `Was in the ${template.location.toLowerCase()}, ${template.activity.toLowerCase()}`,
    truth: 'Actually committed the murder during this time',
    holes: selectedFlaws
  }
}

/**
 * Generate a solid alibi (for innocent suspects)
 */
export function generateSolidAlibi(template: AlibiTemplate, witness: string): {
  claimed: string
  truth: string
  holes: string[]
} {
  return {
    claimed: `Was in the ${template.location.toLowerCase()}, ${template.activity.toLowerCase()}`,
    truth: `Genuinely was ${template.activity.toLowerCase()} - confirmed by ${witness}`,
    holes: [] // Innocent, no holes
  }
}
