/**
 * Hollywood Premiere Adapter
 * 
 * Converts the hardcoded Hollywood Premiere mystery to the universal MysteryBlueprint format.
 */

import type { MysteryBlueprint, CharacterBlueprint, LocationBlueprint, EvidenceBlueprint } from '../types/MysteryBlueprint'
import { CHARACTERS, WORLD_STATE, CHARACTER_GREETINGS, CHARACTER_PROMPTS, LOCATIONS, DISCOVERABLE_EVIDENCE } from '../../mysteries/hollywood-premiere/characters'

export function getHollywoodBlueprint(): MysteryBlueprint {
  // Convert characters
  const characters: CharacterBlueprint[] = CHARACTERS.map(char => ({
    id: char.id,
    name: char.name,
    role: char.role,
    personality: char.personality,
    speechPattern: char.speechPattern,
    greeting: CHARACTER_GREETINGS[char.id] || `*${char.name} looks up as you approach.*\n\nDetective.`,
    systemPrompt: CHARACTER_PROMPTS[char.id] || generateSystemPrompt(char),
    publicInfo: char.publicInfo,
    privateSecrets: char.privateSecrets,
    alibi: {
      claimed: char.alibi,
      truth: char.isGuilty ? extractKillerTruth(char) : char.alibi,
      holes: char.isGuilty ? extractAlibiHoles(char) : []
    },
    relationships: char.relationships,
    knowledge: extractKnowledge(char),
    isGuilty: char.isGuilty,
    pressureProfile: {
      threshold: char.isGuilty ? 85 : 55,
      weaknesses: extractWeaknesses(char),
      telltales: extractTelltales(char)
    },
    videoStyle: {
      cinematography: extractCinematography(char),
      emotionalTone: extractEmotionalTone(char),
      visualMotifs: extractVisualMotifs(char)
    }
  }))

  // Convert locations from the LOCATIONS object
  const locations: LocationBlueprint[] = Object.entries(LOCATIONS).map(([id, loc]) => ({
    id,
    name: loc.name,
    description: loc.description,
    evidenceIds: getEvidenceIdsForLocation(id),
    characterPresent: getCharacterForLocation(id)
  }))

  // Convert discoverable evidence
  const evidence: EvidenceBlueprint[] = DISCOVERABLE_EVIDENCE.map(ev => ({
    id: ev.id,
    name: extractEvidenceName(ev.id),
    type: ev.type,
    location: extractEvidenceLocation(ev.id),
    description: ev.description,
    detailedDescription: expandEvidenceDescription(ev),
    discoveryCondition: determineDiscoveryCondition(ev),
    requiredQuestions: ev.requiredQuestions,
    implications: extractImplications(ev),
    hint: extractHint(ev),
    relatedCharacter: extractRelatedCharacter(ev.id),
    pointsTo: extractPointsTo(ev.id),
    dialogueUnlocks: extractDialogueUnlocks(ev.id)
  }))

  // Build timeline
  const timeline = [
    {
      time: '6:00 PM',
      location: 'lobby',
      participants: ['vivian', 'rex', 'gloria', 'bernard', 'dolores', 'arthur'],
      description: 'Premiere begins. All VIP guests arrive at the Palladium Theatre.',
      isPublicKnowledge: true,
      witnesses: ['vivian', 'rex', 'gloria', 'bernard', 'dolores', 'arthur']
    },
    {
      time: '7:30 PM',
      location: 'vipLounge',
      participants: ['bernard', 'victor'],
      description: 'Vivian overhears Bernard threatening Victor about "what happened in Tijuana".',
      isPublicKnowledge: false,
      witnesses: ['vivian']
    },
    {
      time: '9:00 PM',
      location: 'vipLounge',
      participants: ['victor'],
      description: 'Victor Malone leaves the VIP lounge, saying he needs to check something.',
      isPublicKnowledge: true,
      witnesses: ['vivian', 'rex', 'bernard', 'dolores', 'arthur']
    },
    {
      time: '9:05 PM',
      location: 'dressingRooms',
      participants: ['gloria'],
      description: 'Rex sees Gloria heading toward the restricted stairwell that leads to the projection room.',
      isPublicKnowledge: false,
      witnesses: ['rex']
    },
    {
      time: '9:10 PM',
      location: 'vipLounge',
      participants: ['bernard'],
      description: 'Arthur sees Bernard leaving the manager\'s office looking "absolutely terrified".',
      isPublicKnowledge: false,
      witnesses: ['arthur']
    },
    {
      time: '9:12 PM',
      location: 'projectionRoom',
      participants: ['gloria', 'victor'],
      description: 'Gloria confronts Victor in the projection room about destroying her career.',
      isPublicKnowledge: false,
      witnesses: []
    },
    {
      time: '9:15 PM',
      location: 'projectionRoom',
      participants: ['gloria', 'victor'],
      description: 'Victor mocks Gloria. She strangles him with a film strip from "The Queen of Hearts".',
      isPublicKnowledge: false,
      witnesses: []
    },
    {
      time: '9:17 PM',
      location: 'rooftop',
      participants: ['gloria'],
      description: 'Gloria escapes via the service hatch to the rooftop, then down the fire escape.',
      isPublicKnowledge: false,
      witnesses: []
    },
    {
      time: '9:20 PM',
      location: 'projectionRoom',
      participants: [],
      description: 'The film projection suddenly stops. The murder is discovered.',
      isPublicKnowledge: true,
      witnesses: ['all']
    }
  ]

  // Solution
  const solution = {
    killerId: 'gloria',
    motive: {
      type: 'revenge' as const,
      description: 'Victor Malone destroyed Gloria\'s career when she refused his advances in 1938. He blacklisted her, ruined her reputation, and turned her into a pariah. Tonight she learned he was grooming another young actress the same way.',
      triggerEvent: 'Learning that Victor was targeting a new young actress with the same predatory pattern'
    },
    method: {
      weapon: 'Film strip from "The Queen of Hearts" (1928)',
      opportunity: 'Gloria knew the theater\'s layout from her old premiere days. She followed Victor to the projection room.'
    },
    criticalEvidence: [
      'gloria_stairwell',
      'film_strip_evidence',
      'alibi_gap',
      'gloria_motive',
      'gloria_old_film',
      'inside_job'
    ],
    keyContradictions: [
      'Gloria claims she was in the powder room, but the attendant says no one matching her description was there',
      'Rex saw Gloria heading toward the restricted stairwell at 9:05 PM',
      'The murder weapon was a film strip from Gloria\'s own 1928 film "The Queen of Hearts"',
      'Gloria knew about the service hatch escape route - knowledge only someone familiar with the old theater would have'
    ],
    logicalChain: [
      '1. Victor Malone destroyed Gloria\'s career in 1938 when she refused his advances',
      '2. Gloria attended the premiere after years of absence - unusual and suspicious',
      '3. Rex saw Gloria heading toward the restricted stairwell at 9:05 PM',
      '4. Gloria claims she was in the powder room 9:00-9:15, but the attendant contradicts this',
      '5. Victor was strangled with a film strip from "The Queen of Hearts" - Gloria\'s 1928 film',
      '6. Arthur mentions Gloria kept reels of her old films as mementos',
      '7. The killer escaped via a service hatch only someone familiar with the theater would know',
      '8. Gloria learned Victor was targeting another young actress - the trigger',
      '9. Gloria had motive (revenge), means (film strip), opportunity (knew the layout), and no real alibi'
    ],
    redHerrings: [
      'bernard', // Had motive (embezzlement, Tijuana), looked terrified
      'rex', // Being blackmailed by Victor
      'dolores', // Losing Victor as a client
      'vivian' // Being replaced by younger actress
    ]
  }

  // Dialogue unlocks
  const dialogueUnlocks = {
    'gloria_stairwell': [
      { characterId: 'rex', prompt: 'Ask about seeing Gloria near the projection room' },
      { characterId: 'gloria', prompt: 'Confront about being seen near the stairwell' }
    ],
    'film_strip_evidence': [
      { characterId: 'gloria', prompt: 'Ask about "The Queen of Hearts" film' },
      { characterId: 'arthur', prompt: 'Ask about Gloria\'s old films' }
    ],
    'alibi_gap': [
      { characterId: 'gloria', prompt: 'Ask who can confirm her alibi' }
    ],
    'gloria_motive': [
      { characterId: 'vivian', prompt: 'Ask why Gloria\'s career really ended' },
      { characterId: 'gloria', prompt: 'Ask about what Victor did to her' }
    ],
    'victor_blackmail': [
      { characterId: 'dolores', prompt: 'Ask what Victor knew about people' }
    ],
    'bernard_fear': [
      { characterId: 'bernard', prompt: 'Ask why he looked terrified' },
      { characterId: 'arthur', prompt: 'Ask what he saw' }
    ]
  }

  // Scoring
  const scoring = {
    parTime: 50, // 50 minutes expected (slightly harder)
    maxScore: 1000,
    difficultyMultiplier: 1.1, // Slightly harder than Ashford
    penalties: {
      wrongAccusation: 200,
      excessiveTime: 10
    },
    bonuses: {
      allEvidenceFound: 200,
      allContradictionsDiscovered: 150,
      underParTime: 100,
      firstAttemptCorrect: 250
    }
  }

  return {
    id: 'hollywood-premiere',
    title: 'Murder at the Premiere',
    subtitle: 'Death in the Spotlight',
    difficulty: 'medium',
    era: '1940s',
    setting: {
      location: 'The Palladium Theatre, Hollywood',
      date: 'March 15th, 1947',
      event: 'Movie Premiere - "Shadows Over Sunset"',
      weather: WORLD_STATE.weather,
      atmosphere: 'Glamorous exterior hiding dark secrets, noir Hollywood',
      publicKnowledge: WORLD_STATE.publicKnowledge
    },
    victim: {
      name: WORLD_STATE.victim,
      role: 'Renowned film director',
      personality: 'Charismatic genius and predatory monster',
      causeOfDeath: 'Strangulation with film strip',
      secrets: [
        'Predatory behavior toward actresses for decades',
        'Blackmailed multiple industry figures',
        'Kept compromising photos in his private safe',
        'Destroyed Gloria Fontaine\'s career when she refused him'
      ],
      lastSeen: {
        time: '9:00 PM',
        location: 'VIP Lounge',
        witness: 'Multiple witnesses saw him leave'
      }
    },
    characters,
    locations,
    evidence,
    timeline,
    solution,
    dialogueUnlocks,
    scoring
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateSystemPrompt(char: any): string {
  return `You are ${char.name}, ${char.role}.

PERSONALITY: ${char.personality}
SPEECH PATTERN: ${char.speechPattern}

PUBLIC INFO: ${char.publicInfo}

SECRETS YOU'RE HIDING:
${char.privateSecrets.map((s: string) => `- ${s}`).join('\n')}

YOUR ALIBI: ${char.alibi}

${char.isGuilty ? 'YOU ARE THE KILLER.' : 'YOU ARE INNOCENT.'}

Respond in character. Stay consistent with your personality and speech patterns.`
}

function extractKillerTruth(char: any): string {
  if (char.id === 'gloria') {
    return 'Gloria went to the projection room via the restricted stairwell at 9:05 PM, confronted Victor, and strangled him with a film strip from her 1928 film "The Queen of Hearts". She escaped via the service hatch to the rooftop.'
  }
  return char.alibi
}

function extractAlibiHoles(char: any): string[] {
  if (char.id === 'gloria') {
    return [
      'Claims she was in the powder room, but the attendant says no one matching her description was there',
      'Rex saw her heading toward the restricted stairwell at 9:05 PM',
      'Cannot explain how the killer got a film strip from her old movie',
      'Knows about the service hatch escape route - suspicious knowledge'
    ]
  }
  return []
}

function extractKnowledge(char: any): any {
  const knowledgeMap: Record<string, any> = {
    rex: {
      sawSomething: true,
      whatTheySaw: 'Saw Gloria heading toward the restricted stairwell around 9:05 PM',
      whyTheyreHiding: 'Doesn\'t want to accuse a respected actress without being sure'
    },
    vivian: {
      sawSomething: true,
      whatTheySaw: 'Overheard Bernard threatening Victor about "Tijuana"',
      whyTheyreHiding: 'Protecting information to use as leverage'
    },
    arthur: {
      sawSomething: true,
      whatTheySaw: 'Saw Bernard leaving the manager\'s office looking terrified at 9:10 PM',
      whyTheyreHiding: 'Gathering material for his tell-all book'
    }
  }
  return knowledgeMap[char.id] || { sawSomething: false }
}

function extractWeaknesses(char: any): string[] {
  const weaknessMap: Record<string, string[]> = {
    gloria: ['Victor destroying her career', 'The film strip', 'Her alibi', 'The service hatch'],
    vivian: ['Being replaced', 'Pills/addiction', 'The affair with Victor'],
    rex: ['Drug addiction', 'Fake war record', 'Victor\'s blackmail'],
    bernard: ['Embezzlement', 'Tijuana incident', 'Fake war record creation'],
    dolores: ['Covering up for Victor', 'Losing her star client', 'The dossiers'],
    arthur: ['Taking bribes', 'His ex-wife', 'The tell-all book']
  }
  return weaknessMap[char.id] || []
}

function extractTelltales(char: any): string[] {
  const telltaleMap: Record<string, string[]> = {
    gloria: ['Maintains icy composure', 'Pauses before answering', 'French phrases slip when stressed'],
    vivian: ['Theatrical gestures increase', 'Touches jewelry', 'Voice becomes breathy'],
    rex: ['Humor becomes forced', 'Runs hand through hair', 'Goes quiet'],
    bernard: ['Sweats visibly', 'Mops brow', 'Becomes blustery'],
    dolores: ['Long silences', 'Ice-cold stare', 'Clipped responses'],
    arthur: ['Literary flourishes increase', 'Adjusts glasses', 'Verbose deflection']
  }
  return telltaleMap[char.id] || []
}

function extractCinematography(char: any): string {
  const cinematographyMap: Record<string, string> = {
    gloria: 'Classic Hollywood lighting, soft focus with hard edges',
    vivian: 'Glamour shot, soft focus, sparkle and shine',
    rex: 'Matinee idol framing, conflicted shadows',
    bernard: 'Unflattering angles, harsh overhead lighting',
    dolores: 'Sharp focus, geometric composition, film noir',
    arthur: 'Medium shot, cigarette smoke, intellectual distance'
  }
  return cinematographyMap[char.id] || 'Medium shot, theatrical lighting'
}

function extractEmotionalTone(char: any): string {
  const toneMap: Record<string, string> = {
    gloria: 'Dignified melancholy masking rage',
    vivian: 'Performative emotion, insecurity beneath glamour',
    rex: 'Charm hiding self-loathing and fear',
    bernard: 'Greasy panic, calculated damage control',
    dolores: 'Cold calculation, buried grief',
    arthur: 'Sardonic observation, intellectual superiority'
  }
  return toneMap[char.id] || 'Guarded, tense'
}

function extractVisualMotifs(char: any): string[] {
  const motifMap: Record<string, string[]> = {
    gloria: ['Faded elegance', 'Old photograph', 'Cigarette in holder'],
    vivian: ['Diamonds', 'Champagne glass', 'Mirror reflections'],
    rex: ['War medals (fake)', 'Whiskey', 'Troubled eyes'],
    bernard: ['Sweat on brow', 'Expensive suit straining', 'Pocket watch'],
    dolores: ['Sharp angles', 'Notebook', 'Severe silhouette'],
    arthur: ['Typewriter', 'Whiskey flask', 'Ink-stained fingers']
  }
  return motifMap[char.id] || []
}

function getEvidenceIdsForLocation(locationId: string): string[] {
  const evidenceMap: Record<string, string[]> = {
    projectionRoom: ['film_strip_evidence', 'inside_job'],
    lobby: [],
    dressingRooms: ['vivian_threat'],
    backAlley: [],
    vipLounge: ['bernard_fear'],
    rooftop: []
  }
  return evidenceMap[locationId] || []
}

function getCharacterForLocation(locationId: string): string | undefined {
  const characterMap: Record<string, string> = {
    lobby: 'vivian',
    vipLounge: 'bernard',
    dressingRooms: 'dolores'
  }
  return characterMap[locationId]
}

function extractEvidenceName(evidenceId: string): string {
  const nameMap: Record<string, string> = {
    'gloria_stairwell': 'Witness Testimony: Gloria Near Stairwell',
    'gloria_motive': 'Testimony: Victor Destroyed Gloria',
    'alibi_gap': 'Contradiction: Powder Room Alibi',
    'film_strip_evidence': 'Physical: Film Strip from "The Queen of Hearts"',
    'victor_blackmail': 'Testimony: Victor\'s Blackmail Files',
    'bernard_fear': 'Testimony: Bernard Looking Terrified',
    'rex_blackmail': 'Testimony: Rex Being Blackmailed',
    'vivian_threat': 'Testimony: Bernard\'s Tijuana Threat',
    'dolores_coverup': 'Testimony: Dolores Covered for Victor',
    'gloria_evidence': 'Document: Gloria\'s Evidence Collection',
    'inside_job': 'Physical: Service Hatch Escape Route',
    'gloria_old_film': 'Testimony: Gloria Kept Old Film Reels'
  }
  return nameMap[evidenceId] || evidenceId
}

function extractEvidenceLocation(evidenceId: string): string {
  if (evidenceId.includes('testimony') || evidenceId.includes('contradiction')) {
    return 'conversation'
  }
  const locationMap: Record<string, string> = {
    'film_strip_evidence': 'projectionRoom',
    'inside_job': 'projectionRoom',
    'vivian_threat': 'dressingRooms'
  }
  return locationMap[evidenceId] || 'conversation'
}

function expandEvidenceDescription(ev: any): string {
  return ev.description // Already detailed in DISCOVERABLE_EVIDENCE
}

function determineDiscoveryCondition(ev: any): any {
  if (ev.type === 'physical') return 'room-search'
  if (ev.type === 'contradiction') return 'contradiction'
  return 'interrogation'
}

function extractImplications(ev: any): any {
  const implicationMap: Record<string, any> = {
    'gloria_stairwell': { implicates: ['gloria'], exonerates: [], reveals: 'Gloria was near the crime scene' },
    'gloria_motive': { implicates: ['gloria'], exonerates: [], reveals: 'Gloria had strong motive for revenge' },
    'alibi_gap': { implicates: ['gloria'], exonerates: [], reveals: 'Gloria\'s alibi is false' },
    'film_strip_evidence': { implicates: ['gloria'], exonerates: [], reveals: 'The murder weapon ties to Gloria' },
    'victor_blackmail': { implicates: ['bernard', 'rex', 'dolores'], exonerates: [], reveals: 'Multiple people had motive' },
    'bernard_fear': { implicates: ['bernard'], exonerates: [], reveals: 'Bernard was terrified of Victor' },
    'rex_blackmail': { implicates: ['rex'], exonerates: [], reveals: 'Rex was being blackmailed' }
  }
  return implicationMap[ev.id] || { implicates: [], exonerates: [], reveals: '' }
}

function extractHint(ev: any): string | undefined {
  const hintMap: Record<string, string> = {
    'gloria_stairwell': 'Who had access to the projection room?',
    'film_strip_evidence': 'Why would the killer use THIS specific film?',
    'alibi_gap': 'Can anyone confirm Gloria\'s whereabouts?'
  }
  return hintMap[ev.id]
}

function extractRelatedCharacter(evidenceId: string): string | undefined {
  if (evidenceId.startsWith('gloria_')) return 'gloria'
  if (evidenceId.startsWith('bernard_')) return 'bernard'
  if (evidenceId.startsWith('rex_')) return 'rex'
  if (evidenceId.startsWith('vivian_')) return 'vivian'
  if (evidenceId.startsWith('dolores_')) return 'dolores'
  return undefined
}

function extractPointsTo(evidenceId: string): string | undefined {
  const pointsToMap: Record<string, string> = {
    'gloria_stairwell': 'gloria',
    'gloria_motive': 'gloria',
    'alibi_gap': 'gloria',
    'film_strip_evidence': 'gloria',
    'inside_job': 'gloria'
  }
  return pointsToMap[evidenceId]
}

function extractDialogueUnlocks(evidenceId: string): any[] {
  const unlockMap: Record<string, any[]> = {
    'gloria_stairwell': [
      { characterId: 'rex', prompt: 'Ask about seeing Gloria near the projection room' },
      { characterId: 'gloria', prompt: 'Confront about being seen near the stairwell' }
    ],
    'film_strip_evidence': [
      { characterId: 'gloria', prompt: 'Ask about "The Queen of Hearts" film' },
      { characterId: 'arthur', prompt: 'Ask about Gloria\'s old films' }
    ]
  }
  return unlockMap[evidenceId] || []
}
