import Anthropic from '@anthropic-ai/sdk'

export interface Statement {
  id: string
  characterId: string
  characterName: string
  topic: string
  content: string
  timestamp: number
  playerQuestion: string
  // Enhanced tracking
  entities: string[] // People, places, times mentioned
  claims: string[] // Specific factual claims made
  emotionalTone: string // Detected emotional state
}

// Semantic similarity categories for better matching
export const SEMANTIC_CATEGORIES = {
  TIME_LOCATION: ['whereabouts', 'timeline', 'alibi', 'location'],
  RELATIONSHIPS: ['relationship', 'emotions', 'feelings'],
  ACTIONS_EVENTS: ['actions', 'observations', 'knowledge'],
  PHYSICAL_EVIDENCE: ['possessions', 'evidence', 'objects'],
} as const

export interface DetectedContradiction {
  id: string
  statement1: Statement
  statement2: Statement
  explanation: string
  severity: 'minor' | 'significant' | 'major'
  discoveredAt: number
}

// In-memory statement store
const statementStore: Statement[] = []

// Track detected contradictions to avoid duplicates
const detectedContradictions: Map<string, DetectedContradiction> = new Map()

// Topics that we care about for contradiction detection
const RELEVANT_TOPICS = [
  'whereabouts',
  'alibi',
  'timeline',
  'relationship',
  'knowledge',
  'actions',
  'observations',
  'possessions',
  'emotions',
  'secrets',
]

/**
 * Extract the topic from a player's question
 */
export function extractTopic(question: string): string {
  const questionLower = question.toLowerCase()

  // Location/alibi related
  if (questionLower.match(/where|location|room|were you|alibi|at \d|o'clock|time/)) {
    return 'whereabouts'
  }

  // Timeline related
  if (questionLower.match(/when|what time|before|after|during|midnight|evening|night/)) {
    return 'timeline'
  }

  // Relationship related
  if (questionLower.match(/relationship|know|friend|enemy|love|hate|feel about|think of/)) {
    return 'relationship'
  }

  // Actions/behavior
  if (questionLower.match(/did you|have you|what did|saw you|seen|hear|heard|notice/)) {
    return 'actions'
  }

  // Knowledge about events/people
  if (questionLower.match(/know about|aware|tell me about|what do you know/)) {
    return 'knowledge'
  }

  // Observations
  if (questionLower.match(/see|saw|witness|notice|observe|hear|heard/)) {
    return 'observations'
  }

  // Possessions
  if (questionLower.match(/have|own|possess|belong|yours|letter|glass|key|weapon/)) {
    return 'possessions'
  }

  // Emotional state
  if (questionLower.match(/feel|feeling|emotion|angry|sad|happy|worried|nervous|afraid/)) {
    return 'emotions'
  }

  return 'general'
}

/**
 * Extract entities (people, places, times) from text
 */
function extractEntities(text: string): string[] {
  const entities: string[] = []
  const textLower = text.toLowerCase()

  // Character names
  const characters = ['victoria', 'thomas', 'eleanor', 'marcus', 'lillian', 'james', 'edmund', 'father', 'mother']
  characters.forEach((name) => {
    if (textLower.includes(name)) entities.push(name)
  })

  // Locations
  const locations = ['study', 'parlor', 'dining', 'garden', 'kitchen', 'hallway', 'manor', 'library']
  locations.forEach((loc) => {
    if (textLower.includes(loc)) entities.push(loc)
  })

  // Times
  const timePattern = /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm|o'clock)?|\bmidnight\b|\bevening\b|\bnight\b)\b/gi
  const times = text.match(timePattern)
  if (times) entities.push(...times.map((t) => t.toLowerCase()))

  return [...new Set(entities)]
}

/**
 * Extract specific claims from a statement
 */
function extractClaims(question: string, response: string): string[] {
  const claims: string[] = []
  const responseLower = response.toLowerCase()

  // Location claims
  if (responseLower.includes('i was in') || responseLower.includes("i wasn't in")) {
    const locMatch = response.match(/I was(?:n't| not)? in (?:the )?(\w+)/i)
    if (locMatch) claims.push(`location:${locMatch[1]}`)
  }

  // Time claims
  const timeMatch = response.match(/at (\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i)
  if (timeMatch) claims.push(`time:${timeMatch[1]}`)

  // Seeing/not seeing someone
  if (responseLower.includes('i saw') || responseLower.includes("i didn't see")) {
    const sawMatch = response.match(/I (?:saw|didn't see) (\w+)/i)
    if (sawMatch) claims.push(`witness:${sawMatch[1]}`)
  }

  // Knowledge claims
  if (responseLower.includes("i know") || responseLower.includes("i don't know")) {
    claims.push('knowledge_claim')
  }

  return claims
}

/**
 * Detect emotional tone from response
 */
function detectEmotionalTone(response: string): string {
  const responseLower = response.toLowerCase()

  // Check for stage directions and emotional indicators
  if (responseLower.includes('*nervous*') || responseLower.includes('stammers') || responseLower.includes('fidget')) {
    return 'nervous'
  }
  if (responseLower.includes('*angry*') || responseLower.includes('snaps') || responseLower.includes('furious')) {
    return 'angry'
  }
  if (responseLower.includes('*sad*') || responseLower.includes('tears') || responseLower.includes('grief')) {
    return 'sad'
  }
  if (responseLower.includes('*defensive*') || responseLower.includes('bristles')) {
    return 'defensive'
  }
  if (responseLower.includes('*calm*') || responseLower.includes('composed')) {
    return 'calm'
  }

  return 'neutral'
}

/**
 * Add a statement to the store with enhanced analysis
 */
export function addStatement(
  characterId: string,
  characterName: string,
  playerQuestion: string,
  response: string
): Statement {
  const topic = extractTopic(playerQuestion)
  const entities = extractEntities(response)
  const claims = extractClaims(playerQuestion, response)
  const emotionalTone = detectEmotionalTone(response)

  const statement: Statement = {
    id: `stmt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    characterId,
    characterName,
    topic,
    content: response,
    timestamp: Date.now(),
    playerQuestion,
    entities,
    claims,
    emotionalTone,
  }

  statementStore.push(statement)

  // Keep store manageable (last 100 statements)
  if (statementStore.length > 100) {
    statementStore.shift()
  }

  return statement
}

/**
 * Get statements by a specific character
 */
export function getStatementsByCharacter(characterId: string): Statement[] {
  return statementStore.filter((s) => s.characterId === characterId)
}

/**
 * Get statements on a specific topic
 */
export function getStatementsByTopic(topic: string): Statement[] {
  return statementStore.filter((s) => s.topic === topic)
}

/**
 * Get all statements
 */
export function getAllStatements(): Statement[] {
  return [...statementStore]
}

/**
 * Check if two topics are semantically related
 */
function areTopicsRelated(topic1: string, topic2: string): boolean {
  // Same topic
  if (topic1 === topic2) return true

  // Check semantic categories
  for (const category of Object.values(SEMANTIC_CATEGORIES)) {
    if (category.includes(topic1) && category.includes(topic2)) {
      return true
    }
  }

  return false
}

/**
 * Calculate entity overlap between statements
 */
function calculateEntityOverlap(entities1: string[], entities2: string[]): number {
  if (!entities1.length || !entities2.length) return 0
  const overlap = entities1.filter((e) => entities2.includes(e))
  return overlap.length / Math.min(entities1.length, entities2.length)
}

/**
 * Find potential contradictions between statements
 * Uses enhanced semantic matching based on entities, claims, and topics
 */
export function findPotentialContradictions(newStatement: Statement): Statement[] {
  const potentialMatches: Array<{ statement: Statement; score: number }> = []

  for (const existing of statementStore) {
    // Skip if same statement or same character
    if (existing.id === newStatement.id || existing.characterId === newStatement.characterId) {
      continue
    }

    let score = 0

    // Topic relation (base score)
    if (areTopicsRelated(existing.topic, newStatement.topic)) {
      score += 1
    }

    // Entity overlap (people, places, times mentioned)
    const entityOverlap = calculateEntityOverlap(
      existing.entities || [],
      newStatement.entities || []
    )
    score += entityOverlap * 2 // Strong weight for shared entities

    // Claim type matching
    const existingClaims = existing.claims || []
    const newClaims = newStatement.claims || []
    const claimTypes1 = existingClaims.map((c) => c.split(':')[0])
    const claimTypes2 = newClaims.map((c) => c.split(':')[0])
    const sharedClaimTypes = claimTypes1.filter((t) => claimTypes2.includes(t))
    if (sharedClaimTypes.length > 0) {
      score += 1.5 // Claims about same things are likely contradictory
    }

    // Time-related cross matching (high priority for alibis)
    const timeEntities1 = (existing.entities || []).filter(
      (e) => e.match(/\d/) || ['midnight', 'evening', 'night'].includes(e)
    )
    const timeEntities2 = (newStatement.entities || []).filter(
      (e) => e.match(/\d/) || ['midnight', 'evening', 'night'].includes(e)
    )
    if (timeEntities1.length > 0 && timeEntities2.length > 0) {
      // Both mention times - potential timeline contradiction
      score += 1
    }

    if (score >= 1) {
      potentialMatches.push({ statement: existing, score })
    }
  }

  // Sort by score and return top candidates
  return potentialMatches
    .sort((a, b) => b.score - a.score)
    .slice(0, 8) // Check more potential matches
    .map((m) => m.statement)
}

/**
 * Use Claude to analyze if two statements contradict each other
 * Enhanced with nuanced severity detection and better context
 */
export async function analyzeContradiction(
  anthropic: Anthropic,
  statement1: Statement,
  statement2: Statement
): Promise<DetectedContradiction | null> {
  // Check if we already detected this contradiction pair
  const pairKey = [statement1.id, statement2.id].sort().join('-')
  if (detectedContradictions.has(pairKey)) {
    return null
  }

  // Build context about shared entities
  const sharedEntities = (statement1.entities || []).filter(
    (e) => (statement2.entities || []).includes(e)
  )
  const entityContext = sharedEntities.length > 0
    ? `Both statements mention: ${sharedEntities.join(', ')}`
    : ''

  const prompt = `You are an expert detective analyzing statements from suspects in a 1920s murder mystery.

STATEMENT 1:
Character: ${statement1.characterName}
Question asked: "${statement1.playerQuestion}"
Their response: "${statement1.content}"
Emotional tone detected: ${statement1.emotionalTone || 'neutral'}

STATEMENT 2:
Character: ${statement2.characterName}
Question asked: "${statement2.playerQuestion}"
Their response: "${statement2.content}"
Emotional tone detected: ${statement2.emotionalTone || 'neutral'}

${entityContext}

Analyze these statements for contradictions. Look for:
1. **Direct conflicts**: Impossible for both to be true (e.g., door was open vs. door was closed)
2. **Timeline impossibilities**: Can't be in two places at once, events can't happen in claimed order
3. **Witness conflicts**: Different accounts of who was where, who said what
4. **Factual inconsistencies**: Claims about objects, sounds, or actions that don't match
5. **Subtle discrepancies**: Details that don't quite align even if not directly contradictory

Severity guidelines:
- **minor**: Small discrepancies that could be honest mistakes or different perspectives
- **significant**: Clear factual conflicts that suggest at least one person is wrong or lying
- **major**: Fundamental contradictions about key events - one of them MUST be lying

Respond with JSON only:
{
  "isContradiction": true/false,
  "severity": "minor" | "significant" | "major",
  "contradictionType": "timeline" | "location" | "witness" | "factual" | "behavioral",
  "explanation": "Detective-suitable explanation of the contradiction (1-2 clear sentences)",
  "suggestedFollowUp": "A question to ask to investigate this contradiction further"
}

If no contradiction, respond: { "isContradiction": false }

JSON only, no other text.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON found in contradiction analysis response')
      return null
    }

    const result = JSON.parse(jsonMatch[0])

    if (result.isContradiction) {
      const contradiction: DetectedContradiction = {
        id: `contra-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        statement1,
        statement2,
        explanation: result.explanation,
        severity: result.severity || 'significant',
        discoveredAt: Date.now(),
      }

      // Store to avoid duplicates
      detectedContradictions.set(pairKey, contradiction)

      return contradiction
    }

    return null
  } catch (error) {
    console.error('Error analyzing contradiction:', error)
    return null
  }
}

/**
 * Check new statement against all existing statements for contradictions
 */
export async function checkForContradictions(
  anthropic: Anthropic,
  newStatement: Statement
): Promise<DetectedContradiction[]> {
  const potentialMatches = findPotentialContradictions(newStatement)
  const detected: DetectedContradiction[] = []

  // Limit checks to avoid too many API calls
  const toCheck = potentialMatches.slice(0, 5)

  for (const existing of toCheck) {
    const contradiction = await analyzeContradiction(anthropic, newStatement, existing)
    if (contradiction) {
      detected.push(contradiction)
    }
  }

  return detected
}

/**
 * Get all detected contradictions
 */
export function getDetectedContradictions(): DetectedContradiction[] {
  return Array.from(detectedContradictions.values())
}

/**
 * Clear all statements and contradictions (for game reset)
 */
export function clearStatements(): void {
  statementStore.length = 0
  detectedContradictions.clear()
}
