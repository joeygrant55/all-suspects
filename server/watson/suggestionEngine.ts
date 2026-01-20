/**
 * Watson Suggestion Engine
 * Generates helpful investigation hints without spoiling the mystery
 */

import Anthropic from '@anthropic-ai/sdk'
import {
  getAllStatements,
  getStatementsByCharacter,
  getAllCharacterProfiles,
  TrackedStatement,
} from './statementTracker'
import { getAllContradictions, getContradictionPatterns, WatsonContradiction } from './contradictionFinder'
import { Suggestion, TimelineEvent, CHARACTER_NAMES } from './types'

// Store generated suggestions
const suggestions: Map<string, Suggestion> = new Map()

// Store timeline events
const timelineEvents: Map<string, TimelineEvent> = new Map()

// Track what's been suggested to avoid repetition
const suggestedTopics: Set<string> = new Set()

// ============================================================
// SUGGESTION GENERATION
// ============================================================

/**
 * Analyze investigation state and generate contextual suggestions
 */
export async function generateSuggestions(anthropic: Anthropic): Promise<Suggestion[]> {
  const statements = getAllStatements()
  const contradictions = getAllContradictions()
  const profiles = getAllCharacterProfiles()
  const patterns = getContradictionPatterns()

  const newSuggestions: Suggestion[] = []

  // Rule-based suggestions first (fast)
  newSuggestions.push(...generateRuleBasedSuggestions(statements, contradictions, profiles))

  // AI-powered suggestions for more nuanced guidance
  if (statements.length >= 3) {
    const aiSuggestions = await generateAISuggestions(anthropic, statements, contradictions)
    newSuggestions.push(...aiSuggestions)
  }

  // Store and deduplicate
  newSuggestions.forEach((s) => {
    if (!suggestions.has(s.id) && !isDuplicateSuggestion(s)) {
      suggestions.set(s.id, s)
      suggestedTopics.add(getSuggestionKey(s))
    }
  })

  // Return top suggestions by priority
  return Array.from(suggestions.values())
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
    .slice(0, 5)
}

/**
 * Generate suggestions based on investigation rules
 */
function generateRuleBasedSuggestions(
  statements: TrackedStatement[],
  contradictions: WatsonContradiction[],
  profiles: ReturnType<typeof getAllCharacterProfiles>
): Suggestion[] {
  const suggestions: Suggestion[] = []

  // Check which characters haven't been questioned
  const questionedCharacters = new Set(statements.map((s) => s.characterId))
  const allCharacters = Object.keys(CHARACTER_NAMES)

  allCharacters.forEach((charId) => {
    if (!questionedCharacters.has(charId)) {
      suggestions.push({
        id: `sugg-unquestioned-${charId}`,
        type: 'new_line',
        priority: 'high',
        text: `${CHARACTER_NAMES[charId]} hasn't been questioned yet.`,
        reasoning: 'Every suspect should be interviewed at least once.',
        targetCharacter: charId,
      })
    }
  })

  // Check for unresolved contradictions
  const unresolvedContradictions = contradictions.filter((c) => !('resolved' in c) || !c.resolved)
  unresolvedContradictions.forEach((c) => {
    const suggestionKey = `contradiction-${c.id}`
    if (!suggestedTopics.has(suggestionKey)) {
      suggestions.push({
        id: `sugg-contra-${c.id}`,
        type: 'follow_up',
        priority: c.severity === 'critical' ? 'high' : c.severity === 'major' ? 'high' : 'medium',
        text: `There's a ${c.severity} contradiction between ${c.statement1.characterName} and ${c.statement2.characterName}.`,
        reasoning: c.explanation,
        relatedContradiction: c.id,
        targetCharacter: c.statement1.characterId,
      })
    }
  })

  // Check for characters with few statements
  profiles.forEach((profile) => {
    if (profile.totalStatements < 3) {
      suggestions.push({
        id: `sugg-shallow-${profile.characterId}`,
        type: 'follow_up',
        priority: 'medium',
        text: `${profile.characterName} has only been asked ${profile.totalStatements} question(s).`,
        reasoning: 'More thorough questioning may reveal inconsistencies.',
        targetCharacter: profile.characterId,
      })
    }
  })

  // Check for topics not covered
  const coveredTopics = new Set(statements.map((s) => s.topic))
  const importantTopics = ['whereabouts', 'timeline', 'observations', 'relationship']

  importantTopics.forEach((topic) => {
    if (!coveredTopics.has(topic)) {
      suggestions.push({
        id: `sugg-topic-${topic}`,
        type: 'new_line',
        priority: 'medium',
        text: `No one has been questioned about their ${topic} yet.`,
        reasoning: `Understanding everyone's ${topic} is crucial to the investigation.`,
      })
    }
  })

  // Check for increasingly nervous characters
  profiles.forEach((profile) => {
    if (profile.emotionalTrend === 'increasingly-nervous' || profile.emotionalTrend === 'erratic') {
      suggestions.push({
        id: `sugg-nervous-${profile.characterId}`,
        type: 'follow_up',
        priority: 'high',
        text: `${profile.characterName} seems increasingly nervous under questioning.`,
        reasoning: 'Their nervousness may indicate they have something to hide.',
        targetCharacter: profile.characterId,
      })
    }
  })

  // Check for evasive responses
  statements.forEach((s) => {
    if (s.isEvasive && s.confidence < 0.5) {
      const suggestionKey = `evasive-${s.characterId}-${s.topic}`
      if (!suggestedTopics.has(suggestionKey)) {
        suggestions.push({
          id: `sugg-evasive-${s.id}`,
          type: 'follow_up',
          priority: 'medium',
          text: `${s.characterName} was evasive when asked about ${s.topic}.`,
          reasoning: 'Pressing on this topic might reveal more.',
          targetCharacter: s.characterId,
        })
      }
    }
  })

  // Suggest cross-referencing if multiple people mentioned the same event
  const eventMentions: Record<string, string[]> = {}
  statements.forEach((s) => {
    s.keywords.forEach((keyword) => {
      if (!eventMentions[keyword]) eventMentions[keyword] = []
      if (!eventMentions[keyword].includes(s.characterId)) {
        eventMentions[keyword].push(s.characterId)
      }
    })
  })

  Object.entries(eventMentions).forEach(([keyword, characters]) => {
    if (characters.length >= 2) {
      const suggestionKey = `crossref-${keyword}`
      if (!suggestedTopics.has(suggestionKey)) {
        suggestions.push({
          id: `sugg-crossref-${keyword}`,
          type: 'comparison',
          priority: 'medium',
          text: `Multiple suspects mentioned "${keyword}". Their accounts should be compared.`,
          reasoning: 'Cross-referencing testimony can reveal inconsistencies.',
        })
      }
    }
  })

  return suggestions
}

/**
 * Generate AI-powered suggestions using Claude
 */
async function generateAISuggestions(
  anthropic: Anthropic,
  statements: TrackedStatement[],
  contradictions: WatsonContradiction[]
): Promise<Suggestion[]> {
  const profiles = getAllCharacterProfiles()

  // Build investigation summary
  const summary = `
INVESTIGATION STATUS:
- Total statements: ${statements.length}
- Characters questioned: ${new Set(statements.map((s) => s.characterId)).size} of 6
- Contradictions found: ${contradictions.length}
- Unresolved contradictions: ${contradictions.filter((c) => !('resolved' in c) || !c.resolved).length}

RECENT STATEMENTS (last 5):
${statements
  .slice(-5)
  .map((s) => `- ${s.characterName} (${s.topic}): "${s.content.slice(0, 100)}..."`)
  .join('\n')}

CHARACTER STATUS:
${profiles
  .map(
    (p) =>
      `- ${p.characterName}: ${p.totalStatements} statements, ${p.emotionalTrend}, cooperation: ${(p.cooperationLevel * 100).toFixed(0)}%`
  )
  .join('\n')}

${
  contradictions.length > 0
    ? `ACTIVE CONTRADICTIONS:\n${contradictions.map((c) => `- ${c.statement1.characterName} vs ${c.statement2.characterName}: ${c.explanation}`).join('\n')}`
    : ''
}
`

  const prompt = `You are Watson, the detective's assistant in a 1920s murder mystery.

${summary}

Based on the current investigation state, suggest 2-3 productive lines of inquiry.

RULES:
- Be helpful but don't solve the case
- Frame as observations, not conclusions
- Use 1920s detective vocabulary
- NEVER reveal who the killer is
- Focus on what gaps exist in the investigation

Respond with JSON array only:
[
  {
    "type": "follow_up" | "new_line" | "evidence" | "comparison",
    "priority": "low" | "medium" | "high",
    "text": "Suggestion text",
    "reasoning": "Why this matters",
    "targetCharacter": "characterId or null"
  }
]`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return parsed.map((s: Record<string, unknown>, i: number) => ({
        id: `sugg-ai-${Date.now()}-${i}`,
        type: s.type || 'follow_up',
        priority: s.priority || 'medium',
        text: s.text || '',
        reasoning: s.reasoning || '',
        targetCharacter: s.targetCharacter || undefined,
      }))
    }
  } catch (error) {
    console.error('Error generating AI suggestions:', error)
  }

  return []
}

/**
 * Check if suggestion is a duplicate
 */
function isDuplicateSuggestion(suggestion: Suggestion): boolean {
  return suggestedTopics.has(getSuggestionKey(suggestion))
}

/**
 * Generate unique key for suggestion deduplication
 */
function getSuggestionKey(suggestion: Suggestion): string {
  return `${suggestion.type}-${suggestion.targetCharacter || 'general'}-${suggestion.text.slice(0, 30)}`
}

// ============================================================
// TIMELINE MANAGEMENT
// ============================================================

/**
 * Extract timeline events from statements
 */
export function extractTimelineEvents(statements: TrackedStatement[]): TimelineEvent[] {
  const eventMap: Map<string, TimelineEvent> = new Map()

  statements.forEach((s) => {
    // Extract time mentions from entities
    s.entities.times.forEach((time) => {
      const eventKey = `${time}-${s.entities.places[0] || 'unknown'}`

      if (!eventMap.has(eventKey)) {
        eventMap.set(eventKey, {
          time,
          location: s.entities.places[0] || 'unknown location',
          description: `Activity mentioned by ${s.characterName}`,
          sources: [s.id],
          confirmed: false,
          disputed: false,
        })
      } else {
        const existing = eventMap.get(eventKey)!
        if (!existing.sources.includes(s.id)) {
          existing.sources.push(s.id)

          // If multiple sources, mark as confirmed or disputed
          if (existing.sources.length >= 2) {
            // Check if sources agree (simplified check)
            existing.confirmed = true
          }
        }
      }
    })
  })

  // Check for disputed events (same time, different accounts)
  const timeGroups = new Map<string, TimelineEvent[]>()
  eventMap.forEach((event) => {
    const timeKey = event.time
    if (!timeGroups.has(timeKey)) {
      timeGroups.set(timeKey, [])
    }
    timeGroups.get(timeKey)!.push(event)
  })

  timeGroups.forEach((events) => {
    if (events.length > 1) {
      events.forEach((e) => (e.disputed = true))
    }
  })

  // Update stored timeline
  eventMap.forEach((event, key) => {
    timelineEvents.set(key, event)
  })

  return Array.from(eventMap.values()).sort((a, b) => compareTimeStrings(a.time, b.time))
}

/**
 * Compare time strings for sorting
 */
function compareTimeStrings(a: string, b: string): number {
  // Convert to comparable format
  const parseTime = (t: string): number => {
    const lower = t.toLowerCase()

    // Handle special times
    if (lower.includes('midnight')) return 2400
    if (lower.includes('evening')) return 2000
    if (lower.includes('night')) return 2200

    // Parse numeric times
    const match = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
    if (match) {
      let hour = parseInt(match[1])
      const minute = parseInt(match[2] || '0')
      const period = match[3]?.toLowerCase()

      if (period === 'pm' && hour !== 12) hour += 12
      if (period === 'am' && hour === 12) hour = 0

      return hour * 100 + minute
    }

    return 0
  }

  return parseTime(a) - parseTime(b)
}

/**
 * Get all timeline events
 */
export function getTimelineEvents(): TimelineEvent[] {
  return Array.from(timelineEvents.values()).sort((a, b) => compareTimeStrings(a.time, b.time))
}

/**
 * Add a confirmed timeline event
 */
export function addTimelineEvent(event: Omit<TimelineEvent, 'confirmed' | 'disputed'>): void {
  const key = `${event.time}-${event.location}`
  timelineEvents.set(key, {
    ...event,
    confirmed: event.sources.length >= 2,
    disputed: false,
  })
}

// ============================================================
// WATSON OBSERVATIONS
// ============================================================

/**
 * Generate Watson-style observations about the case
 */
export async function generateObservations(anthropic: Anthropic): Promise<string[]> {
  const statements = getAllStatements()
  const contradictions = getAllContradictions()
  const profiles = getAllCharacterProfiles()

  const observations: string[] = []

  // Rule-based observations
  if (statements.length === 0) {
    observations.push('I await the first interrogation with keen interest, Detective.')
  } else if (statements.length < 6) {
    observations.push(`We've gathered ${statements.length} statements thus far. The picture remains incomplete.`)
  }

  if (contradictions.length === 1) {
    observations.push("I've noted our first contradiction. Someone isn't being entirely truthful.")
  } else if (contradictions.length > 3) {
    observations.push(
      `With ${contradictions.length} contradictions on record, the web of deception grows tangled.`
    )
  }

  // Character-specific observations
  const nervousCharacters = profiles.filter((p) => p.emotionalTrend === 'increasingly-nervous')
  if (nervousCharacters.length > 0) {
    observations.push(
      `I observe that ${nervousCharacters.map((c) => c.characterName).join(' and ')} ${nervousCharacters.length === 1 ? 'appears' : 'appear'} increasingly agitated under questioning.`
    )
  }

  // If we have enough data, get AI observation
  if (statements.length >= 5) {
    const aiObservation = await generateAIObservation(anthropic, statements, contradictions)
    if (aiObservation) {
      observations.push(aiObservation)
    }
  }

  return observations
}

/**
 * Generate AI-powered observation
 */
async function generateAIObservation(
  anthropic: Anthropic,
  statements: TrackedStatement[],
  contradictions: WatsonContradiction[]
): Promise<string | null> {
  const prompt = `You are Watson from Sherlock Holmes, assisting in a 1920s murder mystery.

Given:
- ${statements.length} statements collected
- ${contradictions.length} contradictions found
- Characters showing stress: ${getAllCharacterProfiles()
    .filter((p) => p.emotionalTrend !== 'stable')
    .map((p) => p.characterName)
    .join(', ') || 'None yet'}

Write ONE brief observation (1-2 sentences) in Watson's voice. Be insightful but don't reveal the killer. Use 1920s vocabulary.

Respond with just the observation, no formatting.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    })

    return response.content[0].type === 'text' ? response.content[0].text : null
  } catch {
    return null
  }
}

// ============================================================
// CLEANUP
// ============================================================

/**
 * Clear all suggestions
 */
export function clearSuggestions(): void {
  suggestions.clear()
  suggestedTopics.clear()
  timelineEvents.clear()
}

/**
 * Get all suggestions
 */
export function getAllSuggestions(): Suggestion[] {
  return Array.from(suggestions.values())
}

/**
 * Mark suggestion as seen
 */
export function markSuggestionSeen(suggestionId: string): void {
  const suggestion = suggestions.get(suggestionId)
  if (suggestion) {
    suggestedTopics.add(getSuggestionKey(suggestion))
  }
}
