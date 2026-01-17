/**
 * Memory Store for Character Agents
 *
 * Provides persistent memory across investigation sessions with semantic categorization.
 * Characters remember:
 * - All questions asked of them
 * - Evidence presented to them
 * - Their own statements and lies
 * - What they've learned about other characters
 */

export interface Memory {
  id: string
  characterId: string
  type: 'question' | 'evidence' | 'statement' | 'observation' | 'gossip'
  category: string
  content: string
  context: string
  timestamp: number
  importance: 'low' | 'medium' | 'high' | 'critical'
  linkedMemories?: string[] // IDs of related memories
}

export interface CharacterMemory {
  characterId: string
  memories: Memory[]
  knownFacts: Map<string, string> // topic -> what they know
  suspicions: Map<string, string> // characterId -> suspicion
  liesTracked: LieRecord[] // Track their own lies for consistency
}

export interface LieRecord {
  id: string
  topic: string
  lieClaimed: string
  truth: string
  toldTo: string // 'detective'
  timestamp: number
  contradictedBy?: string // If another statement contradicts this
}

// Memory categories for semantic organization
export const MEMORY_CATEGORIES = {
  ALIBI: 'alibi',
  LOCATION: 'location',
  TIME: 'time',
  RELATIONSHIP: 'relationship',
  EVIDENCE: 'evidence',
  ACCUSATION: 'accusation',
  CONFESSION: 'confession',
  OBSERVATION: 'observation',
  MOTIVE: 'motive',
  SECRET: 'secret',
} as const

// In-memory store (in production, this would be persisted to a database)
const characterMemories: Map<string, CharacterMemory> = new Map()

/**
 * Initialize or get character memory
 */
export function getCharacterMemory(characterId: string): CharacterMemory {
  if (!characterMemories.has(characterId)) {
    characterMemories.set(characterId, {
      characterId,
      memories: [],
      knownFacts: new Map(),
      suspicions: new Map(),
      liesTracked: [],
    })
  }
  return characterMemories.get(characterId)!
}

/**
 * Add a memory to a character's store
 */
export function addMemory(
  characterId: string,
  type: Memory['type'],
  category: string,
  content: string,
  context: string,
  importance: Memory['importance'] = 'medium'
): Memory {
  const memory: Memory = {
    id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    characterId,
    type,
    category,
    content,
    context,
    timestamp: Date.now(),
    importance,
  }

  const charMemory = getCharacterMemory(characterId)
  charMemory.memories.push(memory)

  // Keep memories manageable (but much higher limit than conversation history)
  if (charMemory.memories.length > 500) {
    // Remove oldest low-importance memories first
    const lowImportance = charMemory.memories.filter((m) => m.importance === 'low')
    if (lowImportance.length > 0) {
      const toRemove = lowImportance[0]
      const index = charMemory.memories.indexOf(toRemove)
      charMemory.memories.splice(index, 1)
    } else {
      charMemory.memories.shift()
    }
  }

  return memory
}

/**
 * Record when a character tells a lie
 */
export function recordLie(
  characterId: string,
  topic: string,
  lieClaimed: string,
  truth: string
): LieRecord {
  const lie: LieRecord = {
    id: `lie-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    topic,
    lieClaimed,
    truth,
    toldTo: 'detective',
    timestamp: Date.now(),
  }

  const charMemory = getCharacterMemory(characterId)
  charMemory.liesTracked.push(lie)

  return lie
}

/**
 * Get all lies a character has told on a specific topic
 */
export function getLiesByTopic(characterId: string, topic: string): LieRecord[] {
  const charMemory = getCharacterMemory(characterId)
  return charMemory.liesTracked.filter((lie) =>
    lie.topic.toLowerCase().includes(topic.toLowerCase())
  )
}

/**
 * Add a known fact for a character
 */
export function addKnownFact(characterId: string, topic: string, fact: string): void {
  const charMemory = getCharacterMemory(characterId)
  charMemory.knownFacts.set(topic, fact)
}

/**
 * Add a suspicion about another character
 */
export function addSuspicion(
  characterId: string,
  suspectedCharacterId: string,
  suspicion: string
): void {
  const charMemory = getCharacterMemory(characterId)
  charMemory.suspicions.set(suspectedCharacterId, suspicion)
}

/**
 * Search memories by category and/or keyword
 */
export function searchMemories(
  characterId: string,
  options: {
    category?: string
    keyword?: string
    type?: Memory['type']
    minImportance?: Memory['importance']
  }
): Memory[] {
  const charMemory = getCharacterMemory(characterId)
  let results = [...charMemory.memories]

  if (options.category) {
    results = results.filter((m) => m.category === options.category)
  }

  if (options.keyword) {
    const keyword = options.keyword.toLowerCase()
    results = results.filter(
      (m) =>
        m.content.toLowerCase().includes(keyword) ||
        m.context.toLowerCase().includes(keyword)
    )
  }

  if (options.type) {
    results = results.filter((m) => m.type === options.type)
  }

  if (options.minImportance) {
    const importanceLevels = ['low', 'medium', 'high', 'critical']
    const minIndex = importanceLevels.indexOf(options.minImportance)
    results = results.filter(
      (m) => importanceLevels.indexOf(m.importance) >= minIndex
    )
  }

  // Sort by timestamp, most recent first
  results.sort((a, b) => b.timestamp - a.timestamp)

  return results
}

/**
 * Get relevant memories for a topic (for character context)
 */
export function getRelevantMemories(characterId: string, topic: string): Memory[] {
  const charMemory = getCharacterMemory(characterId)
  const topicLower = topic.toLowerCase()

  return charMemory.memories
    .filter(
      (m) =>
        m.category.toLowerCase().includes(topicLower) ||
        m.content.toLowerCase().includes(topicLower) ||
        m.context.toLowerCase().includes(topicLower)
    )
    .sort((a, b) => {
      // Sort by importance first, then recency
      const importanceLevels = ['low', 'medium', 'high', 'critical']
      const impDiff =
        importanceLevels.indexOf(b.importance) -
        importanceLevels.indexOf(a.importance)
      if (impDiff !== 0) return impDiff
      return b.timestamp - a.timestamp
    })
    .slice(0, 10) // Return top 10 most relevant
}

/**
 * Get a summary of what a character knows for system prompt injection
 */
export function getMemorySummary(characterId: string): string {
  const charMemory = getCharacterMemory(characterId)
  const parts: string[] = []

  // Add high-importance memories
  const importantMemories = charMemory.memories
    .filter((m) => m.importance === 'high' || m.importance === 'critical')
    .slice(-10)

  if (importantMemories.length > 0) {
    parts.push('IMPORTANT THINGS YOU REMEMBER FROM THIS INVESTIGATION:')
    importantMemories.forEach((m) => {
      parts.push(`- ${m.content}`)
    })
  }

  // Add known facts
  if (charMemory.knownFacts.size > 0) {
    parts.push('\nFACTS YOU KNOW:')
    charMemory.knownFacts.forEach((fact, topic) => {
      parts.push(`- ${topic}: ${fact}`)
    })
  }

  // Add suspicions
  if (charMemory.suspicions.size > 0) {
    parts.push('\nYOUR SUSPICIONS:')
    charMemory.suspicions.forEach((suspicion, charId) => {
      parts.push(`- About ${charId}: ${suspicion}`)
    })
  }

  // Add lie tracking for consistency (the character "knows" what they've claimed)
  if (charMemory.liesTracked.length > 0) {
    parts.push('\nSTATEMENTS YOU HAVE MADE (stay consistent with these):')
    charMemory.liesTracked.forEach((lie) => {
      parts.push(`- About ${lie.topic}: You claimed "${lie.lieClaimed}"`)
    })
  }

  return parts.join('\n')
}

/**
 * Record that evidence was presented to a character
 */
export function recordEvidencePresented(
  characterId: string,
  evidenceId: string,
  evidenceDescription: string
): Memory {
  return addMemory(
    characterId,
    'evidence',
    MEMORY_CATEGORIES.EVIDENCE,
    `Detective showed me: ${evidenceDescription}`,
    `Evidence ID: ${evidenceId}`,
    'high'
  )
}

/**
 * Record a question asked to a character
 */
export function recordQuestionAsked(
  characterId: string,
  question: string,
  response: string
): Memory {
  // Categorize the question
  const questionLower = question.toLowerCase()
  let category = 'general'

  if (questionLower.includes('where') || questionLower.includes('location')) {
    category = MEMORY_CATEGORIES.LOCATION
  } else if (questionLower.includes('when') || questionLower.includes('time')) {
    category = MEMORY_CATEGORIES.TIME
  } else if (questionLower.includes('alibi')) {
    category = MEMORY_CATEGORIES.ALIBI
  } else if (
    questionLower.includes('know') ||
    questionLower.includes('relationship')
  ) {
    category = MEMORY_CATEGORIES.RELATIONSHIP
  }

  return addMemory(
    characterId,
    'question',
    category,
    `Asked: "${question}" - I answered: "${response.slice(0, 200)}${response.length > 200 ? '...' : ''}"`,
    'Detective interrogation',
    'medium'
  )
}

/**
 * Clear all memories (for game reset)
 */
export function clearAllMemories(): void {
  characterMemories.clear()
}

/**
 * Clear memories for a specific character
 */
export function clearCharacterMemories(characterId: string): void {
  characterMemories.delete(characterId)
}

/**
 * Export all memories (for debugging or persistence)
 */
export function exportAllMemories(): Record<string, CharacterMemory> {
  const result: Record<string, CharacterMemory> = {}
  characterMemories.forEach((memory, id) => {
    result[id] = {
      ...memory,
      knownFacts: Object.fromEntries(memory.knownFacts) as unknown as Map<string, string>,
      suspicions: Object.fromEntries(memory.suspicions) as unknown as Map<string, string>,
    }
  })
  return result
}
