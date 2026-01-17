/**
 * Cross-Reference System for Character Awareness
 *
 * Allows characters to be aware of what other characters have said.
 * This creates natural "gossip" dynamics where:
 * - Characters can reference each other's statements
 * - Word "travels" between characters
 * - Characters react to accusations against them
 * - The web of lies becomes interconnected
 */

import { getAllStatements, Statement } from '../contradictionDetector'

export interface CharacterGossip {
  aboutCharacterId: string
  aboutCharacterName: string
  information: string
  source: 'overheard' | 'accusation' | 'detective_mentioned' | 'rumor'
  timestamp: number
  canReference: boolean // Whether this character can safely reference knowing this
}

// Track what each character has "heard" about others
const gossipNetwork: Map<string, CharacterGossip[]> = new Map()

// Track direct accusations made by the detective
const accusationsMade: Map<string, string[]> = new Map() // characterId -> accusations

/**
 * Get gossip a character has heard about another
 */
export function getGossipAbout(
  characterId: string,
  aboutCharacterId: string
): CharacterGossip[] {
  const allGossip = gossipNetwork.get(characterId) || []
  return allGossip.filter((g) => g.aboutCharacterId === aboutCharacterId)
}

/**
 * Get all gossip a character has heard
 */
export function getAllGossipFor(characterId: string): CharacterGossip[] {
  return gossipNetwork.get(characterId) || []
}

/**
 * Add gossip to a character's knowledge
 */
export function addGossip(
  characterId: string,
  gossip: Omit<CharacterGossip, 'timestamp'>
): void {
  if (!gossipNetwork.has(characterId)) {
    gossipNetwork.set(characterId, [])
  }

  const existing = gossipNetwork.get(characterId)!

  // Avoid duplicating similar gossip
  const isDuplicate = existing.some(
    (g) =>
      g.aboutCharacterId === gossip.aboutCharacterId &&
      g.information.toLowerCase() === gossip.information.toLowerCase()
  )

  if (!isDuplicate) {
    existing.push({
      ...gossip,
      timestamp: Date.now(),
    })
  }
}

/**
 * Record an accusation made by the detective
 */
export function recordAccusation(
  targetCharacterId: string,
  accusation: string
): void {
  if (!accusationsMade.has(targetCharacterId)) {
    accusationsMade.set(targetCharacterId, [])
  }
  accusationsMade.get(targetCharacterId)!.push(accusation)
}

/**
 * Check if a character has been accused of something
 */
export function getAccusationsAgainst(characterId: string): string[] {
  return accusationsMade.get(characterId) || []
}

/**
 * Get statements made by other characters that this character "could have heard"
 * In a manor setting, gossip travels - especially among servants
 */
export function getRelevantCrossStatements(
  characterId: string,
  topic: string
): Statement[] {
  const allStatements = getAllStatements()

  // Filter to other characters' statements on related topics
  return allStatements
    .filter((s) => s.characterId !== characterId)
    .filter((s) => {
      // Check if topic matches or is related
      const topicLower = topic.toLowerCase()
      return (
        s.topic === topic ||
        s.playerQuestion.toLowerCase().includes(topicLower) ||
        s.content.toLowerCase().includes(topicLower)
      )
    })
    .slice(-5) // Most recent 5 relevant statements
}

/**
 * Generate a "what you've heard" section for a character's system prompt
 * This is where the cross-character awareness magic happens
 */
export function generateGossipContext(characterId: string): string {
  const gossip = getAllGossipFor(characterId)
  const accusations = getAccusationsAgainst(characterId)
  const parts: string[] = []

  // Direct accusations against this character
  if (accusations.length > 0) {
    parts.push('THE DETECTIVE HAS ACCUSED YOU OF:')
    accusations.forEach((acc) => {
      parts.push(`- ${acc}`)
    })
    parts.push('You should be defensive about these accusations.')
    parts.push('')
  }

  // Gossip they've heard
  if (gossip.length > 0) {
    parts.push('THINGS YOU HAVE HEARD ABOUT OTHERS (you can reference these naturally):')
    gossip.forEach((g) => {
      const sourceNote =
        g.source === 'detective_mentioned'
          ? '(the detective mentioned this)'
          : g.source === 'overheard'
            ? '(you overheard this)'
            : '(word travels in a manor)'
      parts.push(`- About ${g.aboutCharacterName}: ${g.information} ${sourceNote}`)
    })
  }

  return parts.join('\n')
}

/**
 * When the detective mentions what another character said,
 * this character now "knows" that information
 */
export function processDetectiveMention(
  characterId: string,
  message: string,
  allCharacterNames: string[]
): void {
  const messageLower = message.toLowerCase()

  // Check if detective mentioned another character
  allCharacterNames.forEach((name) => {
    const nameLower = name.toLowerCase()

    // Various patterns for referencing what someone said
    const mentionPatterns = [
      `${nameLower} said`,
      `${nameLower} told`,
      `${nameLower} claims`,
      `${nameLower} mentioned`,
      `according to ${nameLower}`,
      `${nameLower} stated`,
    ]

    const hasMention = mentionPatterns.some((pattern) =>
      messageLower.includes(pattern)
    )

    if (hasMention && name.toLowerCase() !== getCharacterName(characterId).toLowerCase()) {
      // Extract what was said (simplified - real implementation would be smarter)
      const aboutIndex = messageLower.indexOf(nameLower)
      const relevantPart = message.slice(aboutIndex, aboutIndex + 200)

      addGossip(characterId, {
        aboutCharacterId: getCharacterIdFromName(name),
        aboutCharacterName: name,
        information: relevantPart,
        source: 'detective_mentioned',
        canReference: true,
      })
    }
  })
}

/**
 * Spread gossip from one character to related characters
 * (e.g., servants might share info, family members talk)
 */
export function spreadGossip(
  sourceCharacterId: string,
  targetCharacterIds: string[],
  information: string,
  aboutCharacterId: string,
  aboutCharacterName: string
): void {
  targetCharacterIds.forEach((targetId) => {
    if (targetId !== sourceCharacterId && targetId !== aboutCharacterId) {
      addGossip(targetId, {
        aboutCharacterId,
        aboutCharacterName,
        information,
        source: 'rumor',
        canReference: false, // They shouldn't directly reference rumors
      })
    }
  })
}

/**
 * Get relevant information a character might know based on their role
 * and relationships in the manor
 */
export function getRoleBasedKnowledge(characterId: string): string[] {
  const roleKnowledge: Record<string, string[]> = {
    james: [
      'As the butler, you notice everything that happens in the manor',
      'You know the daily schedules of everyone in the household',
      'You prepared the champagne for the midnight toast',
      'You saw who went where throughout the evening',
    ],
    victoria: [
      'As the lady of the house, you are aware of your husband\'s business dealings',
      'You know about the tensions between Edmund and Thomas',
      'You manage the household accounts',
    ],
    thomas: [
      'You know your father was about to change his will',
      'You are aware of the family\'s financial situation',
      'You had a private conversation with your father earlier that evening',
    ],
    eleanor: [
      'As the secretary, you have access to Mr. Ashford\'s private correspondence',
      'You typed up the new will that was to be signed',
      'You know about the letter Thomas wrote to his father',
    ],
    marcus: [
      'As the family physician, you know about everyone\'s health conditions',
      'You are aware of Mrs. Ashford\'s medication',
      'You noticed the champagne had an unusual appearance',
    ],
    lillian: [
      'As a family friend, you have observed the Ashford dynamics for years',
      'You noticed tension between Edmund and Thomas at dinner',
      'You have your own complicated history with this family',
    ],
  }

  return roleKnowledge[characterId] || []
}

// Helper functions (would be imported from characters in real implementation)
function getCharacterName(characterId: string): string {
  const names: Record<string, string> = {
    victoria: 'Victoria Ashford',
    thomas: 'Thomas Ashford',
    eleanor: 'Eleanor Crane',
    marcus: 'Dr. Marcus Webb',
    lillian: 'Lillian Moore',
    james: 'James',
  }
  return names[characterId] || characterId
}

function getCharacterIdFromName(name: string): string {
  const nameLower = name.toLowerCase()
  const ids: Record<string, string> = {
    victoria: 'victoria',
    thomas: 'thomas',
    eleanor: 'eleanor',
    marcus: 'marcus',
    lillian: 'lillian',
    james: 'james',
  }

  for (const [key, id] of Object.entries(ids)) {
    if (nameLower.includes(key)) return id
  }
  return nameLower
}

/**
 * Clear all cross-reference data (for game reset)
 */
export function clearCrossReferences(): void {
  gossipNetwork.clear()
  accusationsMade.clear()
}

/**
 * Get a character's awareness of the investigation state
 * This helps characters seem more naturally aware of the situation
 */
export function getInvestigationAwareness(characterId: string): string {
  const allStatements = getAllStatements()
  const otherCharacterStatements = allStatements.filter(
    (s) => s.characterId !== characterId
  )

  if (otherCharacterStatements.length === 0) {
    return 'The detective has just begun their investigation.'
  }

  const uniqueCharsQuestioned = new Set(
    otherCharacterStatements.map((s) => s.characterId)
  ).size
  const totalQuestions = allStatements.length

  let awareness = `The detective has asked approximately ${totalQuestions} questions `
  awareness += `and has spoken with ${uniqueCharsQuestioned} other suspects. `

  // Add hints about tension in the house
  if (totalQuestions > 10) {
    awareness += 'The investigation is intensifying, and tensions are running high.'
  } else if (totalQuestions > 5) {
    awareness += 'Word is traveling through the manor about the investigation.'
  }

  return awareness
}
