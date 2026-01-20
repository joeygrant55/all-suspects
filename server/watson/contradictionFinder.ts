/**
 * Watson Contradiction Finder
 * Advanced contradiction detection using semantic analysis and Claude
 */

import Anthropic from '@anthropic-ai/sdk'
import {
  TrackedStatement,
  getAllStatements,
  getStatementsByCharacter,
  getStatementsByTopic,
} from './statementTracker'

export interface WatsonContradiction {
  id: string
  type: 'direct' | 'timeline' | 'location' | 'witness' | 'behavioral' | 'logical'
  severity: 'minor' | 'significant' | 'major' | 'critical'
  statement1: TrackedStatement
  statement2: TrackedStatement
  explanation: string
  implication: string // What this contradiction suggests
  suggestedQuestions: string[] // Follow-up questions to investigate
  affectedCharacters: string[]
  discoveredAt: number
  confidence: number // 0-1, how confident Watson is about this contradiction
}

export interface ContradictionPattern {
  id: string
  name: string
  description: string
  involvedStatements: string[] // Statement IDs
  suspectCharacters: string[]
  likelihood: number // 0-1
}

// Detected contradictions storage
const contradictions: Map<string, WatsonContradiction> = new Map()

// Contradiction patterns (recurring issues)
const patterns: Map<string, ContradictionPattern> = new Map()

/**
 * Calculate relevance score between two statements
 * Higher score = more likely to be related/potentially contradictory
 */
function calculateRelevanceScore(s1: TrackedStatement, s2: TrackedStatement): number {
  let score = 0

  // Same topic = high relevance
  if (s1.topic === s2.topic) score += 2

  // Related topics
  const relatedTopics: Record<string, string[]> = {
    whereabouts: ['timeline', 'actions', 'observations'],
    timeline: ['whereabouts', 'actions', 'observations'],
    actions: ['whereabouts', 'timeline', 'observations'],
    observations: ['whereabouts', 'timeline', 'actions'],
    relationship: ['motive', 'emotions', 'secrets'],
    motive: ['relationship', 'secrets'],
  }

  if (relatedTopics[s1.topic]?.includes(s2.topic)) score += 1

  // Shared entities (people, places, times)
  const sharedPeople = s1.entities.people.filter((p) => s2.entities.people.includes(p))
  const sharedPlaces = s1.entities.places.filter((p) => s2.entities.places.includes(p))
  const sharedTimes = s1.entities.times.filter((t) => s2.entities.times.includes(t))

  score += sharedPeople.length * 0.5
  score += sharedPlaces.length * 0.75
  score += sharedTimes.length * 1.0 // Time overlap is very important

  // Similar claims
  const s1ClaimTypes = s1.claims.map((c) => c.type)
  const s2ClaimTypes = s2.claims.map((c) => c.type)
  const sharedClaimTypes = s1ClaimTypes.filter((t) => s2ClaimTypes.includes(t))
  score += sharedClaimTypes.length * 0.5

  // Keyword overlap
  const sharedKeywords = s1.keywords.filter((k) => s2.keywords.includes(k))
  score += sharedKeywords.length * 0.25

  return score
}

/**
 * Find potential contradictions for a statement
 */
export function findPotentialContradictions(statement: TrackedStatement): TrackedStatement[] {
  const allStatements = getAllStatements()
  const candidates: Array<{ statement: TrackedStatement; score: number }> = []

  for (const existing of allStatements) {
    // Skip self and same character
    if (existing.id === statement.id || existing.characterId === statement.characterId) {
      continue
    }

    const score = calculateRelevanceScore(statement, existing)

    if (score >= 1.5) {
      candidates.push({ statement: existing, score })
    }
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((c) => c.statement)
}

/**
 * Determine contradiction type
 */
function determineContradictionType(
  s1: TrackedStatement,
  s2: TrackedStatement,
  analysis: string
): WatsonContradiction['type'] {
  const analysisLower = analysis.toLowerCase()

  if (analysisLower.includes('time') || analysisLower.includes('when') || analysisLower.includes('clock')) {
    return 'timeline'
  }
  if (analysisLower.includes('location') || analysisLower.includes('where') || analysisLower.includes('room')) {
    return 'location'
  }
  if (analysisLower.includes('saw') || analysisLower.includes('witness') || analysisLower.includes('seen')) {
    return 'witness'
  }
  if (analysisLower.includes('behavior') || analysisLower.includes('demeanor') || analysisLower.includes('emotion')) {
    return 'behavioral'
  }
  if (analysisLower.includes('cannot both') || analysisLower.includes('impossible') || analysisLower.includes('logic')) {
    return 'logical'
  }

  return 'direct'
}

/**
 * Analyze two statements for contradictions using Claude
 */
export async function analyzeForContradiction(
  anthropic: Anthropic,
  statement1: TrackedStatement,
  statement2: TrackedStatement
): Promise<WatsonContradiction | null> {
  // Check if already analyzed
  const pairKey = [statement1.id, statement2.id].sort().join('|')
  if (contradictions.has(pairKey)) {
    return null
  }

  // Build context about shared elements
  const sharedPeople = statement1.entities.people.filter((p) => statement2.entities.people.includes(p))
  const sharedPlaces = statement1.entities.places.filter((p) => statement2.entities.places.includes(p))
  const sharedTimes = statement1.entities.times.filter((t) => statement2.entities.times.includes(t))

  const contextParts: string[] = []
  if (sharedPeople.length > 0) contextParts.push(`Both mention: ${sharedPeople.join(', ')}`)
  if (sharedPlaces.length > 0) contextParts.push(`Shared locations: ${sharedPlaces.join(', ')}`)
  if (sharedTimes.length > 0) contextParts.push(`Overlapping times: ${sharedTimes.join(', ')}`)

  const prompt = `You are Watson, the brilliant detective assistant analyzing statements from a 1920s murder mystery.

STATEMENT 1:
Character: ${statement1.characterName}
Player asked: "${statement1.playerQuestion}"
Response: "${statement1.content}"
Emotional state: ${statement1.emotionalState.primary} (intensity: ${statement1.emotionalState.intensity.toFixed(1)})
Confidence level: ${(statement1.confidence * 100).toFixed(0)}%
Evasive: ${statement1.isEvasive ? 'Yes' : 'No'}

STATEMENT 2:
Character: ${statement2.characterName}
Player asked: "${statement2.playerQuestion}"
Response: "${statement2.content}"
Emotional state: ${statement2.emotionalState.primary} (intensity: ${statement2.emotionalState.intensity.toFixed(1)})
Confidence level: ${(statement2.confidence * 100).toFixed(0)}%
Evasive: ${statement2.isEvasive ? 'Yes' : 'No'}

${contextParts.length > 0 ? `SHARED CONTEXT:\n${contextParts.join('\n')}` : ''}

Analyze these statements for contradictions. Look for:
1. **Direct conflicts**: Facts that cannot both be true
2. **Timeline impossibilities**: Events that couldn't happen as described
3. **Location conflicts**: Claims about being in incompatible places
4. **Witness conflicts**: Different accounts of who was where/what happened
5. **Behavioral inconsistencies**: Emotional or behavioral claims that conflict
6. **Logical impossibilities**: Statements that violate logic when combined

Rate severity:
- **minor**: Small discrepancies, could be misremembering
- **significant**: Clear conflict, at least one person is wrong
- **major**: Fundamental contradiction, someone is lying
- **critical**: Evidence of deliberate deception about key events

Rate your confidence in this contradiction (0-1).

Respond ONLY with valid JSON:
{
  "isContradiction": true/false,
  "type": "direct" | "timeline" | "location" | "witness" | "behavioral" | "logical",
  "severity": "minor" | "significant" | "major" | "critical",
  "explanation": "Clear explanation of the contradiction (1-2 sentences)",
  "implication": "What this suggests about the case or the characters involved",
  "suggestedQuestions": ["Question 1 to investigate further", "Question 2"],
  "confidence": 0.0-1.0
}

If no contradiction: { "isContradiction": false }`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON found in contradiction analysis response')
      return null
    }

    const result = JSON.parse(jsonMatch[0])

    if (!result.isContradiction) {
      return null
    }

    const contradiction: WatsonContradiction = {
      id: `watson-contra-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: result.type || determineContradictionType(statement1, statement2, result.explanation || ''),
      severity: result.severity || 'significant',
      statement1,
      statement2,
      explanation: result.explanation || 'Statements appear to conflict',
      implication: result.implication || 'Further investigation needed',
      suggestedQuestions: result.suggestedQuestions || [],
      affectedCharacters: [statement1.characterId, statement2.characterId],
      discoveredAt: Date.now(),
      confidence: typeof result.confidence === 'number' ? result.confidence : 0.7,
    }

    // Store the contradiction
    contradictions.set(pairKey, contradiction)

    // Check for patterns
    detectPatterns(contradiction)

    return contradiction
  } catch (error) {
    console.error('Error analyzing contradiction:', error)
    return null
  }
}

/**
 * Detect patterns in contradictions
 */
function detectPatterns(newContradiction: WatsonContradiction): void {
  // Check if this character has multiple contradictions
  const characterContradictions: Record<string, number> = {}

  contradictions.forEach((c) => {
    c.affectedCharacters.forEach((charId) => {
      characterContradictions[charId] = (characterContradictions[charId] || 0) + 1
    })
  })

  // If a character has 3+ contradictions, flag as suspicious
  Object.entries(characterContradictions).forEach(([charId, count]) => {
    if (count >= 3) {
      const patternId = `pattern-${charId}-multiple`
      if (!patterns.has(patternId)) {
        const charName =
          newContradiction.affectedCharacters.includes(charId)
            ? newContradiction.statement1.characterId === charId
              ? newContradiction.statement1.characterName
              : newContradiction.statement2.characterName
            : charId

        patterns.set(patternId, {
          id: patternId,
          name: `Multiple Contradictions: ${charName}`,
          description: `${charName} has been caught in ${count} contradictions, suggesting possible deception`,
          involvedStatements: Array.from(contradictions.values())
            .filter((c) => c.affectedCharacters.includes(charId))
            .flatMap((c) => [c.statement1.id, c.statement2.id]),
          suspectCharacters: [charId],
          likelihood: Math.min(0.5 + count * 0.1, 0.95),
        })
      }
    }
  })

  // Check for timeline-specific patterns
  const timelineContradictions = Array.from(contradictions.values()).filter(
    (c) => c.type === 'timeline'
  )
  if (timelineContradictions.length >= 2) {
    const patternId = 'pattern-timeline-chaos'
    if (!patterns.has(patternId)) {
      patterns.set(patternId, {
        id: patternId,
        name: 'Timeline Discrepancies',
        description:
          'Multiple suspects have given conflicting accounts of the timeline, suggesting coordinated deception or a complex sequence of events',
        involvedStatements: timelineContradictions.flatMap((c) => [c.statement1.id, c.statement2.id]),
        suspectCharacters: [...new Set(timelineContradictions.flatMap((c) => c.affectedCharacters))],
        likelihood: 0.7,
      })
    }
  }
}

/**
 * Check new statement against all existing statements
 */
export async function checkStatementForContradictions(
  anthropic: Anthropic,
  newStatement: TrackedStatement
): Promise<WatsonContradiction[]> {
  const candidates = findPotentialContradictions(newStatement)
  const detected: WatsonContradiction[] = []

  // Analyze top candidates (limit to avoid too many API calls)
  const toAnalyze = candidates.slice(0, 5)

  for (const existing of toAnalyze) {
    const contradiction = await analyzeForContradiction(anthropic, newStatement, existing)
    if (contradiction) {
      detected.push(contradiction)
    }
  }

  return detected
}

/**
 * Get all detected contradictions
 */
export function getAllContradictions(): WatsonContradiction[] {
  return Array.from(contradictions.values()).sort((a, b) => b.discoveredAt - a.discoveredAt)
}

/**
 * Get contradictions involving a specific character
 */
export function getContradictionsByCharacter(characterId: string): WatsonContradiction[] {
  return getAllContradictions().filter((c) => c.affectedCharacters.includes(characterId))
}

/**
 * Get contradictions by type
 */
export function getContradictionsByType(type: WatsonContradiction['type']): WatsonContradiction[] {
  return getAllContradictions().filter((c) => c.type === type)
}

/**
 * Get contradictions by severity
 */
export function getContradictionsBySeverity(
  severity: WatsonContradiction['severity']
): WatsonContradiction[] {
  return getAllContradictions().filter((c) => c.severity === severity)
}

/**
 * Get all detected patterns
 */
export function getContradictionPatterns(): ContradictionPattern[] {
  return Array.from(patterns.values()).sort((a, b) => b.likelihood - a.likelihood)
}

/**
 * Get investigation summary
 */
export function getContradictionSummary(): {
  total: number
  bySeverity: Record<string, number>
  byType: Record<string, number>
  byCharacter: Record<string, number>
  patterns: ContradictionPattern[]
} {
  const all = getAllContradictions()

  const bySeverity: Record<string, number> = {
    minor: 0,
    significant: 0,
    major: 0,
    critical: 0,
  }

  const byType: Record<string, number> = {
    direct: 0,
    timeline: 0,
    location: 0,
    witness: 0,
    behavioral: 0,
    logical: 0,
  }

  const byCharacter: Record<string, number> = {}

  all.forEach((c) => {
    bySeverity[c.severity]++
    byType[c.type]++
    c.affectedCharacters.forEach((charId) => {
      byCharacter[charId] = (byCharacter[charId] || 0) + 1
    })
  })

  return {
    total: all.length,
    bySeverity,
    byType,
    byCharacter,
    patterns: getContradictionPatterns(),
  }
}

/**
 * Clear all contradiction data
 */
export function clearContradictions(): void {
  contradictions.clear()
  patterns.clear()
}

/**
 * Export contradiction data
 */
export function exportContradictionData(): {
  contradictions: WatsonContradiction[]
  patterns: ContradictionPattern[]
  summary: ReturnType<typeof getContradictionSummary>
} {
  return {
    contradictions: getAllContradictions(),
    patterns: getContradictionPatterns(),
    summary: getContradictionSummary(),
  }
}
