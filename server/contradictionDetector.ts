import Anthropic from '@anthropic-ai/sdk'

export interface Statement {
  id: string
  characterId: string
  characterName: string
  topic: string
  content: string
  timestamp: number
  playerQuestion: string
}

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
 * Add a statement to the store
 */
export function addStatement(
  characterId: string,
  characterName: string,
  playerQuestion: string,
  response: string
): Statement {
  const topic = extractTopic(playerQuestion)

  const statement: Statement = {
    id: `stmt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    characterId,
    characterName,
    topic,
    content: response,
    timestamp: Date.now(),
    playerQuestion,
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
 * Find potential contradictions between statements
 * Returns pairs of statements that might contradict each other
 */
export function findPotentialContradictions(newStatement: Statement): Statement[] {
  const potentialMatches: Statement[] = []

  for (const existing of statementStore) {
    // Skip if same statement or same character
    if (existing.id === newStatement.id || existing.characterId === newStatement.characterId) {
      continue
    }

    // Check if topics are related enough to potentially contradict
    const topicsRelated =
      existing.topic === newStatement.topic ||
      (existing.topic === 'whereabouts' && newStatement.topic === 'timeline') ||
      (existing.topic === 'timeline' && newStatement.topic === 'whereabouts') ||
      (existing.topic === 'actions' && newStatement.topic === 'observations') ||
      (existing.topic === 'observations' && newStatement.topic === 'actions')

    if (topicsRelated) {
      potentialMatches.push(existing)
    }
  }

  return potentialMatches
}

/**
 * Use Claude to analyze if two statements contradict each other
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

  const prompt = `You are analyzing statements from suspects in a 1920s murder mystery for potential contradictions.

STATEMENT 1:
Character: ${statement1.characterName}
In response to: "${statement1.playerQuestion}"
Said: "${statement1.content}"

STATEMENT 2:
Character: ${statement2.characterName}
In response to: "${statement2.playerQuestion}"
Said: "${statement2.content}"

Analyze if these statements contradict each other. Consider:
- Time/location conflicts (can't be in two places at once)
- Different accounts of the same event
- Conflicting claims about who was present
- Inconsistent descriptions of actions or observations

If there IS a meaningful contradiction, respond with JSON:
{
  "isContradiction": true,
  "severity": "minor|significant|major",
  "explanation": "Brief explanation suitable for showing a detective (1-2 sentences)"
}

If there is NO contradiction or the statements are about unrelated things, respond:
{
  "isContradiction": false
}

Respond ONLY with valid JSON, no other text.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const result = JSON.parse(text)

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
