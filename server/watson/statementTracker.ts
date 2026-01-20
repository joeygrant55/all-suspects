/**
 * Watson Statement Tracker
 * Enhanced statement tracking with rich metadata for investigation analysis
 */

export interface TrackedStatement {
  id: string
  characterId: string
  characterName: string
  topic: string
  content: string
  timestamp: number
  playerQuestion: string
  // Enhanced metadata
  entities: {
    people: string[]
    places: string[]
    times: string[]
    objects: string[]
  }
  claims: Claim[]
  emotionalState: EmotionalState
  confidence: number // 0-1, how confident the character seems
  isEvasive: boolean
  keywords: string[]
}

export interface Claim {
  type: 'location' | 'time' | 'action' | 'witness' | 'possession' | 'knowledge' | 'relationship'
  subject: string
  predicate: string
  object?: string
  negated: boolean
  timestamp?: string // When the claim refers to
}

export interface EmotionalState {
  primary: 'calm' | 'nervous' | 'defensive' | 'angry' | 'sad' | 'fearful' | 'evasive' | 'neutral'
  intensity: number // 0-1
  indicators: string[] // What triggered this assessment
}

export interface CharacterProfile {
  characterId: string
  characterName: string
  totalStatements: number
  topicsCovered: string[]
  emotionalTrend: 'stable' | 'increasingly-nervous' | 'increasingly-defensive' | 'erratic'
  consistencyScore: number // 0-1
  cooperationLevel: number // 0-1
  lastInteraction: number
  keyClaimsTimeline: { time: string; claim: string }[]
}

// In-memory storage
const statements: Map<string, TrackedStatement> = new Map()
const characterProfiles: Map<string, CharacterProfile> = new Map()

// Character names mapping
const CHARACTER_NAMES: Record<string, string> = {
  victoria: 'Victoria Ashford',
  thomas: 'Thomas Ashford',
  eleanor: 'Eleanor Crane',
  marcus: 'Dr. Marcus Webb',
  lillian: 'Lillian Moore',
  james: 'James',
}

/**
 * Extract people mentioned in text
 */
function extractPeople(text: string): string[] {
  const people: string[] = []
  const textLower = text.toLowerCase()

  const characterPatterns = [
    { pattern: /victoria|mrs\.?\s*ashford|wife/gi, name: 'Victoria' },
    { pattern: /thomas|son|heir/gi, name: 'Thomas' },
    { pattern: /eleanor|secretary|miss\s*crane/gi, name: 'Eleanor' },
    { pattern: /marcus|doctor|dr\.?\s*webb|physician/gi, name: 'Dr. Webb' },
    { pattern: /lillian|miss\s*moore|family\s*friend/gi, name: 'Lillian' },
    { pattern: /james|butler/gi, name: 'James' },
    { pattern: /edmund|mr\.?\s*ashford|victim|deceased|master/gi, name: 'Edmund' },
  ]

  characterPatterns.forEach(({ pattern, name }) => {
    if (pattern.test(text)) {
      people.push(name)
    }
  })

  return [...new Set(people)]
}

/**
 * Extract places mentioned in text
 */
function extractPlaces(text: string): string[] {
  const places: string[] = []
  const textLower = text.toLowerCase()

  const locationPatterns = [
    { pattern: /study|office/gi, place: 'study' },
    { pattern: /parlor|parlour|sitting\s*room/gi, place: 'parlor' },
    { pattern: /dining|dinner/gi, place: 'dining room' },
    { pattern: /garden|outside|terrace/gi, place: 'garden' },
    { pattern: /kitchen|pantry/gi, place: 'kitchen' },
    { pattern: /hallway|hall|corridor|entrance/gi, place: 'hallway' },
    { pattern: /library/gi, place: 'library' },
    { pattern: /manor|house|estate/gi, place: 'manor' },
    { pattern: /stairs|staircase/gi, place: 'stairs' },
    { pattern: /bedroom|chamber/gi, place: 'bedroom' },
  ]

  locationPatterns.forEach(({ pattern, place }) => {
    if (pattern.test(text)) {
      places.push(place)
    }
  })

  return [...new Set(places)]
}

/**
 * Extract times mentioned in text
 */
function extractTimes(text: string): string[] {
  const times: string[] = []

  // Specific times
  const timePatterns = [
    /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm|o'clock))\b/gi,
    /\b(midnight)\b/gi,
    /\b(around|about|approximately)\s+(\d{1,2}(?::\d{2})?)/gi,
    /\b(before|after)\s+(\d{1,2}(?::\d{2})?)/gi,
    /\b(half\s*past\s*\d{1,2})\b/gi,
    /\b(quarter\s*(?:past|to)\s*\d{1,2})\b/gi,
  ]

  timePatterns.forEach((pattern) => {
    const matches = text.match(pattern)
    if (matches) {
      times.push(...matches.map((t) => t.toLowerCase().trim()))
    }
  })

  // Time periods
  const periodPatterns = [
    /evening/gi,
    /night/gi,
    /dinner\s*time/gi,
    /late\s*night/gi,
    /before\s*midnight/gi,
    /after\s*midnight/gi,
  ]

  periodPatterns.forEach((pattern) => {
    if (pattern.test(text)) {
      const match = text.match(pattern)
      if (match) times.push(match[0].toLowerCase())
    }
  })

  return [...new Set(times)]
}

/**
 * Extract objects mentioned in text
 */
function extractObjects(text: string): string[] {
  const objects: string[] = []
  const textLower = text.toLowerCase()

  const objectPatterns = [
    { pattern: /letter|note|document|paper/gi, object: 'letter' },
    { pattern: /glass|champagne|drink|wine/gi, object: 'glass' },
    { pattern: /key|keys/gi, object: 'key' },
    { pattern: /weapon|knife|gun|pistol/gi, object: 'weapon' },
    { pattern: /clock|watch|timepiece/gi, object: 'clock' },
    { pattern: /book|diary|journal/gi, object: 'book' },
    { pattern: /medicine|pills|medication|prescription/gi, object: 'medicine' },
    { pattern: /money|cash|check/gi, object: 'money' },
    { pattern: /door/gi, object: 'door' },
    { pattern: /window/gi, object: 'window' },
    { pattern: /safe|vault/gi, object: 'safe' },
    { pattern: /phone|telephone/gi, object: 'telephone' },
    { pattern: /poison/gi, object: 'poison' },
    { pattern: /will|testament|inheritance/gi, object: 'will' },
  ]

  objectPatterns.forEach(({ pattern, object }) => {
    if (pattern.test(text)) {
      objects.push(object)
    }
  })

  return [...new Set(objects)]
}

/**
 * Extract claims from a statement
 */
function extractClaims(question: string, response: string): Claim[] {
  const claims: Claim[] = []
  const responseLower = response.toLowerCase()

  // Location claims: "I was in the study"
  const locationMatch = response.match(/I\s+was(?:n't|\s+not)?\s+(?:in|at)\s+(?:the\s+)?(\w+)/i)
  if (locationMatch) {
    claims.push({
      type: 'location',
      subject: 'self',
      predicate: responseLower.includes("wasn't") || responseLower.includes('not') ? 'was not at' : 'was at',
      object: locationMatch[1],
      negated: responseLower.includes("wasn't") || responseLower.includes('not'),
    })
  }

  // Time claims: "at 11:30 PM"
  const timeMatch = response.match(/(?:at|around|about)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i)
  if (timeMatch) {
    claims.push({
      type: 'time',
      subject: 'self',
      predicate: 'present at',
      timestamp: timeMatch[1],
      negated: false,
    })
  }

  // Witness claims: "I saw Thomas" / "I didn't see anyone"
  const sawMatch = response.match(/I\s+(?:saw|noticed|observed|witnessed)(?:n't|\s+not)?\s+(\w+)/i)
  if (sawMatch) {
    claims.push({
      type: 'witness',
      subject: 'self',
      predicate: responseLower.includes("didn't") || responseLower.includes('not') ? 'did not see' : 'saw',
      object: sawMatch[1],
      negated: responseLower.includes("didn't") || responseLower.includes('not'),
    })
  }

  // Hearing claims: "I heard a noise"
  const heardMatch = response.match(/I\s+(?:heard|overheard)(?:n't|\s+not)?\s+(.+?)(?:\.|,|$)/i)
  if (heardMatch) {
    claims.push({
      type: 'witness',
      subject: 'self',
      predicate: 'heard',
      object: heardMatch[1].trim(),
      negated: responseLower.includes("didn't hear"),
    })
  }

  // Knowledge claims: "I know" / "I don't know"
  if (responseLower.includes("i know") || responseLower.includes("i knew")) {
    claims.push({
      type: 'knowledge',
      subject: 'self',
      predicate: 'knows',
      negated: false,
    })
  }
  if (responseLower.includes("i don't know") || responseLower.includes("i didn't know")) {
    claims.push({
      type: 'knowledge',
      subject: 'self',
      predicate: 'knows',
      negated: true,
    })
  }

  // Action claims: "I went to" / "I left"
  const actionMatch = response.match(/I\s+(went|left|returned|stayed|arrived|came)/i)
  if (actionMatch) {
    claims.push({
      type: 'action',
      subject: 'self',
      predicate: actionMatch[1].toLowerCase(),
      negated: false,
    })
  }

  return claims
}

/**
 * Analyze emotional state from response
 */
function analyzeEmotionalState(response: string): EmotionalState {
  const indicators: string[] = []
  let primary: EmotionalState['primary'] = 'neutral'
  let intensity = 0.3

  const responseLower = response.toLowerCase()

  // Check for nervous indicators
  const nervousPatterns = [
    /\*nervous(ly)?\*/i,
    /\*fidget/i,
    /\*stammer/i,
    /\*swallow/i,
    /\*glance/i,
    /hesitat/i,
    /um+|uh+/i,
    /\.\.\./,
  ]

  nervousPatterns.forEach((pattern) => {
    if (pattern.test(response)) {
      indicators.push('nervous body language')
      primary = 'nervous'
      intensity = Math.min(intensity + 0.2, 1)
    }
  })

  // Check for defensive indicators
  const defensivePatterns = [
    /\*defensive(ly)?\*/i,
    /how dare/i,
    /accuse/i,
    /I have nothing to hide/i,
    /why would I/i,
    /that's ridiculous/i,
    /!+/,
  ]

  defensivePatterns.forEach((pattern) => {
    if (pattern.test(response)) {
      indicators.push('defensive response')
      if (primary === 'neutral') primary = 'defensive'
      intensity = Math.min(intensity + 0.15, 1)
    }
  })

  // Check for angry indicators
  const angryPatterns = [
    /\*angry\*/i,
    /\*furious\*/i,
    /\*snaps?\*/i,
    /outrage/i,
    /how dare/i,
    /!{2,}/,
  ]

  angryPatterns.forEach((pattern) => {
    if (pattern.test(response)) {
      indicators.push('anger')
      primary = 'angry'
      intensity = Math.min(intensity + 0.25, 1)
    }
  })

  // Check for evasive indicators
  const evasivePatterns = [
    /I\s+(?:can't|cannot)\s+recall/i,
    /I\s+don't\s+(?:quite\s+)?remember/i,
    /perhaps|maybe|possibly/i,
    /I\s+(?:suppose|think|believe)/i,
    /that's\s+not\s+(?:really\s+)?(?:important|relevant)/i,
    /why\s+do\s+you\s+ask/i,
    /what\s+does\s+that\s+have\s+to\s+do/i,
  ]

  evasivePatterns.forEach((pattern) => {
    if (pattern.test(response)) {
      indicators.push('evasive language')
      if (primary === 'neutral') primary = 'evasive'
      intensity = Math.min(intensity + 0.1, 1)
    }
  })

  // Check for calm/composed
  const calmPatterns = [
    /\*calm(ly)?\*/i,
    /\*composed\*/i,
    /\*matter-of-fact\*/i,
    /certainly|of course|naturally/i,
  ]

  calmPatterns.forEach((pattern) => {
    if (pattern.test(response) && primary === 'neutral') {
      indicators.push('calm demeanor')
      primary = 'calm'
      intensity = 0.3
    }
  })

  // Check for sadness
  const sadPatterns = [
    /\*sad(ly)?\*/i,
    /\*tears?\*/i,
    /\*grief\*/i,
    /\*sigh(s|ing)?\*/i,
    /poor\s+edmund/i,
    /terrible\s+loss/i,
  ]

  sadPatterns.forEach((pattern) => {
    if (pattern.test(response)) {
      indicators.push('sadness')
      if (primary === 'neutral') primary = 'sad'
      intensity = Math.min(intensity + 0.15, 1)
    }
  })

  return {
    primary,
    intensity,
    indicators,
  }
}

/**
 * Check if response is evasive
 */
function isResponseEvasive(response: string): boolean {
  const evasivePatterns = [
    /I\s+(?:can't|cannot)\s+recall/i,
    /I\s+don't\s+(?:quite\s+)?remember/i,
    /I'm\s+not\s+(?:entirely\s+)?sure/i,
    /perhaps|maybe|possibly/i,
    /that's\s+not\s+(?:really\s+)?(?:important|relevant)/i,
    /why\s+do\s+you\s+ask/i,
    /I\s+(?:prefer|would\s+rather)\s+not/i,
    /that's\s+(?:a\s+)?personal/i,
  ]

  return evasivePatterns.some((pattern) => pattern.test(response))
}

/**
 * Calculate confidence level from response
 */
function calculateConfidence(response: string): number {
  let confidence = 0.7 // Base confidence

  // Reduce for uncertainty markers
  const uncertaintyMarkers = [
    /I\s+think/i,
    /I\s+believe/i,
    /perhaps/i,
    /maybe/i,
    /possibly/i,
    /I'm\s+not\s+(?:entirely\s+)?sure/i,
    /I\s+(?:can't|cannot)\s+recall/i,
    /if\s+I\s+recall/i,
  ]

  uncertaintyMarkers.forEach((pattern) => {
    if (pattern.test(response)) {
      confidence -= 0.1
    }
  })

  // Increase for certainty markers
  const certaintyMarkers = [
    /I\s+(?:clearly|distinctly)\s+remember/i,
    /I\s+am\s+(?:certain|sure|positive)/i,
    /absolutely|definitely|certainly/i,
    /without\s+(?:a\s+)?doubt/i,
    /I\s+know\s+(?:for\s+a\s+)?fact/i,
  ]

  certaintyMarkers.forEach((pattern) => {
    if (pattern.test(response)) {
      confidence += 0.1
    }
  })

  return Math.max(0, Math.min(1, confidence))
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  const keywords: string[] = []
  const textLower = text.toLowerCase()

  const importantWords = [
    'murder', 'killed', 'dead', 'death', 'poison',
    'argued', 'argument', 'fight', 'angry',
    'secret', 'affair', 'love', 'hate',
    'money', 'inheritance', 'will', 'disinherit',
    'alibi', 'witness', 'saw', 'heard',
    'suspicious', 'strange', 'unusual',
    'threatening', 'threat', 'blackmail',
    'jealous', 'jealousy', 'revenge',
    'midnight', 'champagne', 'toast',
    'clock', 'stopped', 'hallway',
  ]

  importantWords.forEach((word) => {
    if (textLower.includes(word)) {
      keywords.push(word)
    }
  })

  return keywords
}

/**
 * Determine topic from question
 */
function determineTopic(question: string): string {
  const questionLower = question.toLowerCase()

  if (questionLower.match(/where|location|room|were you|alibi/)) return 'whereabouts'
  if (questionLower.match(/when|what time|before|after|during|midnight/)) return 'timeline'
  if (questionLower.match(/relationship|know|friend|enemy|feel about/)) return 'relationship'
  if (questionLower.match(/did you|have you|what did|saw you|seen/)) return 'actions'
  if (questionLower.match(/know about|aware|tell me about/)) return 'knowledge'
  if (questionLower.match(/see|saw|witness|notice|observe|hear|heard/)) return 'observations'
  if (questionLower.match(/have|own|possess|letter|glass|key/)) return 'possessions'
  if (questionLower.match(/feel|emotion|angry|sad|worried|nervous/)) return 'emotions'
  if (questionLower.match(/motive|reason|why would/)) return 'motive'
  if (questionLower.match(/secret|hiding|truth/)) return 'secrets'

  return 'general'
}

/**
 * Add a new statement to the tracker
 */
export function trackStatement(
  characterId: string,
  playerQuestion: string,
  response: string
): TrackedStatement {
  const characterName = CHARACTER_NAMES[characterId] || characterId

  const statement: TrackedStatement = {
    id: `stmt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    characterId,
    characterName,
    topic: determineTopic(playerQuestion),
    content: response,
    timestamp: Date.now(),
    playerQuestion,
    entities: {
      people: extractPeople(response),
      places: extractPlaces(response),
      times: extractTimes(response),
      objects: extractObjects(response),
    },
    claims: extractClaims(playerQuestion, response),
    emotionalState: analyzeEmotionalState(response),
    confidence: calculateConfidence(response),
    isEvasive: isResponseEvasive(response),
    keywords: extractKeywords(response),
  }

  statements.set(statement.id, statement)

  // Update character profile
  updateCharacterProfile(characterId, statement)

  return statement
}

/**
 * Update character profile based on new statement
 */
function updateCharacterProfile(characterId: string, statement: TrackedStatement): void {
  let profile = characterProfiles.get(characterId)

  if (!profile) {
    profile = {
      characterId,
      characterName: statement.characterName,
      totalStatements: 0,
      topicsCovered: [],
      emotionalTrend: 'stable',
      consistencyScore: 1.0,
      cooperationLevel: 0.7,
      lastInteraction: statement.timestamp,
      keyClaimsTimeline: [],
    }
  }

  profile.totalStatements++
  profile.lastInteraction = statement.timestamp

  if (!profile.topicsCovered.includes(statement.topic)) {
    profile.topicsCovered.push(statement.topic)
  }

  // Add key claims to timeline
  statement.claims.forEach((claim) => {
    if (claim.timestamp) {
      profile!.keyClaimsTimeline.push({
        time: claim.timestamp,
        claim: `${claim.predicate} ${claim.object || ''}`.trim(),
      })
    }
  })

  // Adjust cooperation level based on evasiveness
  if (statement.isEvasive) {
    profile.cooperationLevel = Math.max(0, profile.cooperationLevel - 0.05)
  } else if (statement.confidence > 0.7) {
    profile.cooperationLevel = Math.min(1, profile.cooperationLevel + 0.02)
  }

  // Analyze emotional trend
  const recentStatements = getStatementsByCharacter(characterId).slice(-5)
  const recentEmotions = recentStatements.map((s) => s.emotionalState)

  if (recentEmotions.length >= 3) {
    const nervousCount = recentEmotions.filter((e) => e.primary === 'nervous' || e.primary === 'fearful').length
    const defensiveCount = recentEmotions.filter((e) => e.primary === 'defensive' || e.primary === 'angry').length

    if (nervousCount >= 2) {
      profile.emotionalTrend = 'increasingly-nervous'
    } else if (defensiveCount >= 2) {
      profile.emotionalTrend = 'increasingly-defensive'
    } else if (nervousCount + defensiveCount >= 3) {
      profile.emotionalTrend = 'erratic'
    } else {
      profile.emotionalTrend = 'stable'
    }
  }

  characterProfiles.set(characterId, profile)
}

/**
 * Get all statements
 */
export function getAllStatements(): TrackedStatement[] {
  return Array.from(statements.values()).sort((a, b) => a.timestamp - b.timestamp)
}

/**
 * Get statements by character
 */
export function getStatementsByCharacter(characterId: string): TrackedStatement[] {
  return getAllStatements().filter((s) => s.characterId === characterId)
}

/**
 * Get statements by topic
 */
export function getStatementsByTopic(topic: string): TrackedStatement[] {
  return getAllStatements().filter((s) => s.topic === topic)
}

/**
 * Get statements mentioning a specific entity
 */
export function getStatementsAboutEntity(entity: string): TrackedStatement[] {
  const entityLower = entity.toLowerCase()
  return getAllStatements().filter((s) => {
    const allEntities = [
      ...s.entities.people,
      ...s.entities.places,
      ...s.entities.times,
      ...s.entities.objects,
    ].map((e) => e.toLowerCase())
    return allEntities.includes(entityLower)
  })
}

/**
 * Get character profile
 */
export function getCharacterProfile(characterId: string): CharacterProfile | undefined {
  return characterProfiles.get(characterId)
}

/**
 * Get all character profiles
 */
export function getAllCharacterProfiles(): CharacterProfile[] {
  return Array.from(characterProfiles.values())
}

/**
 * Get statement by ID
 */
export function getStatementById(id: string): TrackedStatement | undefined {
  return statements.get(id)
}

/**
 * Clear all tracked data
 */
export function clearStatementTracker(): void {
  statements.clear()
  characterProfiles.clear()
}

/**
 * Export tracker data for debugging/analysis
 */
export function exportTrackerData(): {
  statements: TrackedStatement[]
  profiles: CharacterProfile[]
} {
  return {
    statements: getAllStatements(),
    profiles: getAllCharacterProfiles(),
  }
}
