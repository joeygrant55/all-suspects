/**
 * Ashford Affair Adapter
 * 
 * Converts the hardcoded Ashford Affair mystery to the universal MysteryBlueprint format.
 * This proves the Blueprint format works with existing game data.
 */

import type { MysteryBlueprint, CharacterBlueprint, LocationBlueprint, EvidenceBlueprint } from '../types/MysteryBlueprint'
import { CHARACTERS, WORLD_STATE, CHARACTER_GREETINGS } from '../../mysteries/ashford-affair/characters'
import { EVIDENCE_DATABASE, EVIDENCE_BY_ROOM, EVIDENCE_DIALOGUE_UNLOCKS } from '../../src/data/evidence'

export function getAshfordBlueprint(): MysteryBlueprint {
  // Convert characters
  const characters: CharacterBlueprint[] = CHARACTERS.map(char => ({
    id: char.id,
    name: char.name,
    role: char.role,
    personality: char.personality,
    speechPattern: char.speechPattern,
    greeting: CHARACTER_GREETINGS[char.id] || `*${char.name} looks up as you approach.*\n\nDetective.`,
    systemPrompt: generateSystemPrompt(char),
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
      threshold: char.isGuilty ? 80 : 50, // Killer is harder to crack
      weaknesses: extractWeaknesses(char),
      telltales: extractTelltales(char)
    },
    videoStyle: {
      cinematography: extractCinematography(char),
      emotionalTone: extractEmotionalTone(char),
      visualMotifs: extractVisualMotifs(char)
    }
  }))

  // Convert locations
  const locations: LocationBlueprint[] = [
    {
      id: 'study',
      name: 'The Study',
      icon: '📚',
      description: 'The crime scene. Edmund Ashford\'s private study, lined with mahogany bookshelves. A heavy desk dominates the room, and a window stands slightly ajar despite the snow.',
      evidenceIds: EVIDENCE_BY_ROOM.study || [],
      characterPresent: 'thomas' // Thomas spends time here
    },
    {
      id: 'parlor',
      name: 'The Parlor',
      icon: '🪑',
      description: 'An elegant sitting room with plush furniture and a crackling fireplace. The warmth contrasts with the tension in the air.',
      evidenceIds: EVIDENCE_BY_ROOM.parlor || [],
      characterPresent: 'victoria'
    },
    {
      id: 'dining-room',
      name: 'The Dining Room',
      icon: '🍽️',
      description: 'A formal dining room with a long table set for the evening\'s dinner. Crystal chandeliers cast soft light over fine china.',
      evidenceIds: EVIDENCE_BY_ROOM['dining-room'] || [],
      characterPresent: 'marcus'
    },
    {
      id: 'kitchen',
      name: 'The Kitchen',
      icon: '🍳',
      description: 'The service area of the manor. Copper pots hang from hooks, and the smell of the evening\'s meal still lingers.',
      evidenceIds: EVIDENCE_BY_ROOM.kitchen || [],
      characterPresent: 'james'
    },
    {
      id: 'hallway',
      name: 'The Hallway',
      icon: '🚪',
      description: 'A long corridor connecting the manor\'s rooms. An ornate grandfather clock ticks ominously... or it did, until it stopped.',
      evidenceIds: EVIDENCE_BY_ROOM.hallway || [],
      characterPresent: 'eleanor'
    },
    {
      id: 'garden',
      name: 'The Garden',
      icon: '🌲',
      description: 'The snow-covered garden, barely visible through the windows. A frozen fountain serves as an unlikely hiding place.',
      evidenceIds: EVIDENCE_BY_ROOM.garden || [],
      characterPresent: 'lillian'
    }
  ]

  // Convert evidence
  const evidence: EvidenceBlueprint[] = Object.values(EVIDENCE_DATABASE).map(ev => ({
    id: ev.id,
    name: ev.name,
    type: ev.type,
    location: ev.id.includes('contradiction') ? 'conversation' : getEvidenceLocation(ev.id),
    description: ev.description,
    detailedDescription: ev.detailedDescription,
    discoveryCondition: 'room-search',
    forensics: extractForensics(ev),
    implications: {
      implicates: ev.pointsTo ? [ev.pointsTo] : [],
      exonerates: [],
      reveals: ev.hint || ''
    },
    hint: ev.hint,
    relatedCharacter: ev.relatedCharacter,
    pointsTo: ev.pointsTo,
    dialogueUnlocks: EVIDENCE_DIALOGUE_UNLOCKS[ev.id] || []
  }))

  // Build timeline
  const timeline = [
    {
      time: '10:00 PM',
      location: 'dining-room',
      participants: ['victoria', 'thomas', 'eleanor', 'marcus', 'lillian', 'james'],
      description: 'Dinner service begins. All guests are present.',
      isPublicKnowledge: true,
      witnesses: ['victoria', 'thomas', 'eleanor', 'marcus', 'lillian', 'james']
    },
    {
      time: '11:00 PM',
      location: 'parlor',
      participants: ['victoria', 'lillian'],
      description: 'Victoria and Lillian retire to the parlor for conversation.',
      isPublicKnowledge: true,
      witnesses: ['victoria', 'lillian']
    },
    {
      time: '11:00 PM',
      location: 'kitchen',
      participants: ['james', 'eleanor'],
      description: 'James and Eleanor prepare the midnight champagne service.',
      isPublicKnowledge: false,
      witnesses: ['james', 'eleanor']
    },
    {
      time: '11:30 PM',
      location: 'study',
      participants: ['thomas'],
      description: 'Thomas enters the study to confront his father. Eleanor sees him go in.',
      isPublicKnowledge: false,
      witnesses: ['eleanor']
    },
    {
      time: '11:32 PM',
      location: 'hallway',
      participants: ['thomas'],
      description: 'Someone rushes through the hallway, bumping the grandfather clock and stopping it.',
      isPublicKnowledge: false,
      witnesses: []
    },
    {
      time: '11:35 PM',
      location: 'garden',
      participants: ['thomas'],
      description: 'Thomas disposes of poisoned gloves in the garden fountain.',
      isPublicKnowledge: false,
      witnesses: []
    },
    {
      time: '11:45 PM',
      location: 'study',
      participants: ['edmund'],
      description: 'Edmund Ashford dies from arsenic poisoning.',
      isPublicKnowledge: false,
      witnesses: []
    },
    {
      time: '11:47 PM',
      location: 'study',
      participants: ['james'],
      description: 'James discovers Edmund\'s body and raises the alarm.',
      isPublicKnowledge: true,
      witnesses: ['james', 'victoria', 'thomas', 'eleanor', 'marcus', 'lillian']
    }
  ]

  // Solution
  const solution = {
    killerId: 'thomas',
    motive: {
      type: 'greed' as const,
      description: 'Thomas owed $50,000 in gambling debts and his father refused to help. Edmund was planning to disinherit Thomas completely.',
      triggerEvent: 'Learning that his father planned to announce the disinheritance at midnight'
    },
    method: {
      weapon: 'Arsenic (from rat poison)',
      poison: 'Arsenic',
      opportunity: 'Thomas had access to the kitchen rat poison and the champagne being prepared for his father'
    },
    criticalEvidence: [
      'threatening-letter',
      'champagne-glass',
      'rat-poison',
      'discarded-gloves',
      'stopped-clock',
      'burned-document'
    ],
    keyContradictions: [
      'Thomas claims he was in the garden, but there are no footprints in the fresh snow',
      'Eleanor saw Thomas entering the study around 11:30, contradicting his alibi',
      'Thomas\'s gloves with poison residue were found in the fountain'
    ],
    logicalChain: [
      '1. Thomas wrote a threatening letter to his father dated Dec 28th',
      '2. Edmund was planning to disinherit Thomas (burned will fragments)',
      '3. Thomas had access to rat poison in the kitchen (arsenic)',
      '4. The champagne glass on Edmund\'s desk shows signs of poisoning',
      '5. Eleanor saw Thomas enter the study at 11:30 PM',
      '6. The grandfather clock stopped at 11:32 PM (someone rushing through)',
      '7. Thomas\'s expensive gloves with chemical residue were found in the fountain',
      '8. Thomas claims he was in the garden, but there are no footprints in the snow',
      '9. Thomas had motive (gambling debts, disinheritance), means (poison), and opportunity (access to champagne)'
    ],
    redHerrings: [
      'victoria', // Had affair with Marcus, but not the killer
      'marcus', // Was being blackmailed, but not the killer
      'lillian' // Had old grudge, but not the killer
    ]
  }

  // Dialogue unlocks map
  const dialogueUnlocks = EVIDENCE_DIALOGUE_UNLOCKS

  // Scoring
  const scoring = {
    parTime: 45, // 45 minutes expected
    maxScore: 1000,
    difficultyMultiplier: 1.0, // Medium difficulty
    penalties: {
      wrongAccusation: 200,
      excessiveTime: 10 // per minute over par
    },
    bonuses: {
      allEvidenceFound: 200,
      allContradictionsDiscovered: 150,
      underParTime: 100,
      firstAttemptCorrect: 250
    }
  }

  return {
    id: 'ashford-affair',
    title: 'The Ashford Affair',
    subtitle: 'Murder at the Manor',
    difficulty: 'medium',
    era: '1920s',
    setting: {
      location: 'Ashford Manor',
      date: 'December 31st, 1929',
      event: 'New Year\'s Eve Party',
      weather: WORLD_STATE.weather,
      atmosphere: 'Tense, claustrophobic, everyone is trapped by the snowstorm',
      publicKnowledge: WORLD_STATE.publicKnowledge
    },
    victim: {
      name: WORLD_STATE.victim,
      role: 'Wealthy patriarch and family tyrant',
      personality: 'Controlling, ruthless, held many secrets over others',
      causeOfDeath: 'Arsenic poisoning',
      secrets: [
        'Was blackmailing Dr. Marcus Webb',
        'Planned to disinherit his son Thomas',
        'Ruined Lillian\'s husband financially decades ago'
      ],
      lastSeen: {
        time: '11:30 PM',
        location: 'The Study',
        witness: 'Thomas (the killer)'
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
  const basePrompt = `You are ${char.name}, ${char.role}.

PERSONALITY: ${char.personality}
SPEECH PATTERN: ${char.speechPattern}

PUBLIC INFO: ${char.publicInfo}

SECRETS YOU'RE HIDING:
${char.privateSecrets.map((s: string) => `- ${s}`).join('\n')}

YOUR ALIBI: ${char.alibi}

RELATIONSHIPS:
${Object.entries(char.relationships).map(([id, desc]) => `- ${id}: ${desc}`).join('\n')}

${char.isGuilty ? `
YOU ARE THE KILLER. You poisoned Edmund Ashford with arsenic from the rat poison.
- DO NOT confess unless confronted with overwhelming evidence
- Maintain your alibi (claiming you were in the garden)
- Deflect suspicion toward others who had motive
- Only crack under extreme pressure with multiple pieces of evidence
` : `
YOU ARE INNOCENT. You did not kill Edmund Ashford.
- Be truthful about what you know, but protect your secrets
- You may lie about your secrets, but not about the murder
- React naturally to pressure and evidence
`}

Respond in character. Stay consistent with your personality and speech patterns.`

  return basePrompt
}

function extractKillerTruth(char: any): string {
  if (char.id === 'thomas') {
    return 'Thomas was in the study poisoning his father\'s champagne with arsenic from the kitchen rat poison around 11:30 PM.'
  }
  return char.alibi
}

function extractAlibiHoles(char: any): string[] {
  if (char.id === 'thomas') {
    return [
      'Claims he was smoking in the garden, but there are no footprints in the fresh snow',
      'Eleanor saw him entering the study around 11:30 PM',
      'Cannot account for the time between 11:30 and 11:40 PM',
      'His gloves were found in the fountain with poison residue'
    ]
  }
  return []
}

function extractKnowledge(char: any): { sawSomething: boolean; whatTheySaw?: string; whyTheyreHiding?: string } {
  if (char.id === 'eleanor') {
    return {
      sawSomething: true,
      whatTheySaw: 'Saw Thomas entering the study around 11:30 PM',
      whyTheyreHiding: 'Afraid to speak up against the family, fears losing her job'
    }
  }
  if (char.id === 'james') {
    return {
      sawSomething: true,
      whatTheySaw: 'Witnessed Thomas entering the study around 11:30 PM',
      whyTheyreHiding: 'Loyal to the family, conflicted about exposing Thomas'
    }
  }
  return { sawSomething: false }
}

function extractWeaknesses(char: any): string[] {
  const weaknessMap: Record<string, string[]> = {
    thomas: ['Gambling debts', 'The threatening letter', 'His father\'s will', 'The rat poison'],
    victoria: ['Her affair with Marcus', 'The sleeping powder', 'Money she moved to Switzerland'],
    eleanor: ['What she saw that night', 'Her feelings for James', 'The embezzlement evidence'],
    marcus: ['The affair with Victoria', 'The patient death he covered up', 'Edmund\'s blackmail'],
    lillian: ['Her late husband', 'The fraud Edmund committed', 'Why she really came'],
    james: ['What he witnessed', 'His feelings for Eleanor', 'Covering for Victoria and Marcus']
  }
  return weaknessMap[char.id] || []
}

function extractTelltales(char: any): string[] {
  const telltaleMap: Record<string, string[]> = {
    thomas: ['Nervous laugh', 'Excessive joviality', 'Avoids eye contact', 'Fidgets with cufflinks'],
    victoria: ['Ice-cold composure cracks', 'Adjusts gloves', 'Pauses before answering'],
    eleanor: ['Chooses words very carefully', 'Glances toward the door', 'Clasps hands tightly'],
    marcus: ['Over-explains', 'Medical jargon when nervous', 'Touches his collar'],
    lillian: ['Bitter remarks slip through', 'Looks away', 'Cigarette trembles slightly'],
    james: ['Stiffens posture', 'Formal language increases', 'Slight hesitation']
  }
  return telltaleMap[char.id] || ['Shifts weight', 'Pauses', 'Looks away']
}

function extractCinematography(char: any): string {
  const cinematographyMap: Record<string, string> = {
    thomas: 'Medium shot, handheld camera suggests instability',
    victoria: 'Elegant framing, soft focus, pearl-lit',
    eleanor: 'Precise composition, sharp focus, observant angles',
    marcus: 'Close-up, warm lighting, medical precision',
    lillian: 'Soft lighting with hard shadows, nostalgic tones',
    james: 'Formal framing, butler in background then foreground'
  }
  return cinematographyMap[char.id] || 'Medium shot, noir lighting'
}

function extractEmotionalTone(char: any): string {
  const toneMap: Record<string, string> = {
    thomas: 'Anxious, forced casualness masking fear',
    victoria: 'Cold, controlled, calculating',
    eleanor: 'Careful, intelligent, quietly conflicted',
    marcus: 'Guilt-ridden, protective, nervous',
    lillian: 'Melancholic, bitter, resigned',
    james: 'Dignified, loyal, quietly knowing'
  }
  return toneMap[char.id] || 'Guarded, tense'
}

function extractVisualMotifs(char: any): string[] {
  const motifMap: Record<string, string[]> = {
    thomas: ['Cigarette smoke', 'Whiskey glass', 'Playing cards'],
    victoria: ['Pearl necklace', 'Gloves', 'Firelight on jewelry'],
    eleanor: ['Typewriter', 'Ledgers', 'Precise movements'],
    marcus: ['Medical bag', 'Pills', 'Wedding ring (he\'s a widower)'],
    lillian: ['Old photograph', 'Teacup', 'Faded elegance'],
    james: ['Butler\'s uniform', 'Silver tray', 'Grandfather clock']
  }
  return motifMap[char.id] || []
}

function getEvidenceLocation(evidenceId: string): string {
  for (const [room, evidenceIds] of Object.entries(EVIDENCE_BY_ROOM)) {
    if (evidenceIds.includes(evidenceId)) {
      return room
    }
  }
  return 'study' // Default to crime scene
}

function extractForensics(ev: any): any {
  const forensicsMap: Record<string, any> = {
    'champagne-glass': {
      fingerprints: ['thomas', 'edmund'],
      otherDetails: { poison: 'arsenic residue detected' }
    },
    'rat-poison': {
      fingerprints: ['james', 'thomas'],
      otherDetails: { contents: 'arsenic-based rodenticide' }
    },
    'discarded-gloves': {
      fingerprints: ['thomas'],
      otherDetails: { chemical: 'arsenic residue on leather' }
    }
  }
  return forensicsMap[ev.id] || undefined
}
